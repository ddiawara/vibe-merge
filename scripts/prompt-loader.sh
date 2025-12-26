#!/usr/bin/env bash
# =============================================================================
# PROMPT LOADER - Chargement centralise des prompts IA avec substitution
# =============================================================================
# Usage:
#   source ./scripts/prompt-loader.sh
#   PROMPT=$(load_prompt "commit" '{"DIFF": "...", "FILES": "..."}')
#   RESPONSE=$(call_ollama "commit" '{"DIFF": "..."}')
# =============================================================================

set -euo pipefail

# Configuration par defaut
PROMPTS_DIR="${PROMPTS_DIR:-${ROOT_DIR:-$(pwd)}/prompts}"
AI_LANG="${AI_LANG:-fr}"
AI_MODEL="${AI_MODEL:-qwen2.5-coder:14b}"
OLLAMA_HOST="${OLLAMA_HOST:-http://localhost:11434}"

# -----------------------------------------------------------------------------
# load_prompt - Charge un fichier prompt avec substitution de variables
# -----------------------------------------------------------------------------
# Arguments:
#   $1 - Nom du prompt (ex: "commit", "pr", "swift/generate")
#   $2 - JSON avec variables de substitution (optionnel)
#        Ex: '{"DIFF": "...", "FILES": "...", "COMMITS": "..."}'
#
# Variables supportees: __VARNAME__ format
# Retourne: Le contenu du prompt avec variables substituees
# -----------------------------------------------------------------------------
load_prompt() {
    local name="$1"
    local vars_json="${2:-{}}"
    local prompt_file=""

    # Determiner le chemin du fichier prompt
    if [[ "$name" == */* ]]; then
        # Prompt specifique module (ex: swift/generate)
        prompt_file="${PROMPTS_DIR}/${name}.txt"
    else
        # Prompt avec support langue
        prompt_file="${PROMPTS_DIR}/${AI_LANG}/${name}.txt"

        # Fallback vers anglais si non trouve
        if [[ ! -f "$prompt_file" ]]; then
            prompt_file="${PROMPTS_DIR}/en/${name}.txt"
        fi
    fi

    # Verifier existence du fichier
    if [[ ! -f "$prompt_file" ]]; then
        echo "ERREUR: Prompt non trouve: $prompt_file" >&2
        return 1
    fi

    # Charger le template
    local template
    template=$(cat "$prompt_file")

    # Appliquer les substitutions si JSON fourni et jq disponible
    if [[ "$vars_json" != "{}" ]] && command -v jq &>/dev/null; then
        local result="$template"

        # Extraire les cles du JSON et substituer chaque __KEY__
        local keys
        keys=$(echo "$vars_json" | jq -r 'keys[]' 2>/dev/null || echo "")

        for key in $keys; do
            local value
            value=$(echo "$vars_json" | jq -r --arg k "$key" '.[$k] // ""' 2>/dev/null || echo "")
            # Echapper les caracteres speciaux pour sed
            local escaped_value
            escaped_value=$(printf '%s\n' "$value" | sed 's/[&/\]/\\&/g')
            result=$(echo "$result" | sed "s|__${key}__|${escaped_value}|g")
        done

        echo "$result"
    else
        echo "$template"
    fi
}

# -----------------------------------------------------------------------------
# call_ollama - Appelle l'API Ollama avec un prompt charge
# -----------------------------------------------------------------------------
# Arguments:
#   $1 - Nom du prompt (ex: "commit")
#   $2 - JSON avec variables de substitution (optionnel)
#   $3 - Modele (optionnel, defaut: $AI_MODEL)
#   $4 - Timeout en secondes (optionnel, defaut: 120)
#
# Retourne: La reponse de l'IA
# -----------------------------------------------------------------------------
call_ollama() {
    local name="$1"
    local vars_json="${2:-{}}"
    local model="${3:-${AI_MODEL}}"
    local timeout="${4:-120}"

    # Charger le prompt
    local prompt
    prompt=$(load_prompt "$name" "$vars_json")

    if [[ $? -ne 0 ]]; then
        echo "$prompt"  # Message d'erreur
        return 1
    fi

    # Appeler Ollama
    local response
    response=$(curl -s --connect-timeout 10 -m "$timeout" "${OLLAMA_HOST}/api/generate" \
        -H "Content-Type: application/json" \
        -d "$(jq -n \
            --arg model "$model" \
            --arg prompt "$prompt" \
            '{model: $model, prompt: $prompt, stream: false}')" \
        | jq -r '.response // empty')

    echo "$response"
}

# -----------------------------------------------------------------------------
# call_ollama_raw - Appelle Ollama avec un prompt brut (sans fichier)
# -----------------------------------------------------------------------------
# Arguments:
#   $1 - Prompt texte brut
#   $2 - Modele (optionnel)
#   $3 - Timeout en secondes (optionnel)
#   $4 - Options JSON additionnelles (ex: '{"temperature": 0.2}')
#
# Retourne: La reponse de l'IA
# -----------------------------------------------------------------------------
call_ollama_raw() {
    local prompt="$1"
    local model="${2:-${AI_MODEL}}"
    local timeout="${3:-120}"
    local options="${4:-{}}"

    # Construire la requete
    local request
    if [[ "$options" != "{}" ]]; then
        request=$(jq -n \
            --arg model "$model" \
            --arg prompt "$prompt" \
            --argjson opts "$options" \
            '{model: $model, prompt: $prompt, stream: false, options: $opts}')
    else
        request=$(jq -n \
            --arg model "$model" \
            --arg prompt "$prompt" \
            '{model: $model, prompt: $prompt, stream: false}')
    fi

    # Appeler Ollama
    curl -s --connect-timeout 10 -m "$timeout" "${OLLAMA_HOST}/api/generate" \
        -H "Content-Type: application/json" \
        -d "$request" \
        | jq -r '.response // empty'
}

# -----------------------------------------------------------------------------
# build_vars_json - Construit un JSON de variables pour substitution
# -----------------------------------------------------------------------------
# Usage: build_vars_json "DIFF" "$diff" "FILES" "$files" ...
# Retourne: JSON object {"DIFF": "...", "FILES": "...", ...}
# -----------------------------------------------------------------------------
build_vars_json() {
    local json="{"
    local first=true

    while [[ $# -ge 2 ]]; do
        local key="$1"
        local value="$2"
        shift 2

        # Echapper les guillemets et newlines dans la valeur
        local escaped_value
        escaped_value=$(printf '%s' "$value" | jq -Rs '.')

        if [[ "$first" == true ]]; then
            json="${json}\"${key}\": ${escaped_value}"
            first=false
        else
            json="${json}, \"${key}\": ${escaped_value}"
        fi
    done

    json="${json}}"
    echo "$json"
}

# -----------------------------------------------------------------------------
# get_prompt_path - Retourne le chemin complet d'un fichier prompt
# -----------------------------------------------------------------------------
# Arguments:
#   $1 - Nom du prompt
# Retourne: Chemin absolu du fichier ou erreur
# -----------------------------------------------------------------------------
get_prompt_path() {
    local name="$1"
    local prompt_file=""

    if [[ "$name" == */* ]]; then
        prompt_file="${PROMPTS_DIR}/${name}.txt"
    else
        prompt_file="${PROMPTS_DIR}/${AI_LANG}/${name}.txt"
        [[ ! -f "$prompt_file" ]] && prompt_file="${PROMPTS_DIR}/en/${name}.txt"
    fi

    if [[ -f "$prompt_file" ]]; then
        echo "$prompt_file"
    else
        echo "ERREUR: $prompt_file non trouve" >&2
        return 1
    fi
}

# -----------------------------------------------------------------------------
# list_prompts - Liste tous les prompts disponibles
# -----------------------------------------------------------------------------
list_prompts() {
    echo "Prompts disponibles:"
    echo ""

    # Prompts par langue
    for lang in fr en; do
        if [[ -d "${PROMPTS_DIR}/${lang}" ]]; then
            echo "[$lang]"
            find "${PROMPTS_DIR}/${lang}" -name "*.txt" -exec basename {} .txt \; 2>/dev/null | sort | sed 's/^/  - /'
            echo ""
        fi
    done

    # Prompts modules (swift, etc.)
    for module_dir in "${PROMPTS_DIR}"/*/; do
        local module=$(basename "$module_dir")
        if [[ "$module" != "fr" && "$module" != "en" && -d "$module_dir" ]]; then
            echo "[$module]"
            find "$module_dir" -name "*.txt" -exec basename {} .txt \; 2>/dev/null | sort | sed "s/^/  - ${module}\//"
            echo ""
        fi
    done
}

# Export des fonctions pour utilisation dans les sous-shells
export -f load_prompt 2>/dev/null || true
export -f call_ollama 2>/dev/null || true
export -f call_ollama_raw 2>/dev/null || true
export -f build_vars_json 2>/dev/null || true
export -f get_prompt_path 2>/dev/null || true
export -f list_prompts 2>/dev/null || true
