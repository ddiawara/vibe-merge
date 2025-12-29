#!/usr/bin/env python3
"""
taskutil.py - Swiss Army Knife for Taskfile automation

Gestion des erreurs:
- Jamais de exit(1) pour ne pas interrompre le workflow
- Toujours retourner une valeur (fallback si erreur)
- Les erreurs sont silencieuses (pas de stderr qui pollue)

Usage:
    python3 taskutil.py prompt --template FILE --files "$FILES" --diff "$DIFF"
    python3 taskutil.py extract --pattern conventional-commit --fallback "chore: update"
    python3 taskutil.py template --file FILE --var "KEY=value"
    python3 taskutil.py json --extract ".key" --fallback "{}"
"""
import sys
import re
import json
import argparse
from pathlib import Path
from string import Template


# ==============================================================================
# COMMAND: prompt - Build AI prompt from template
# ==============================================================================
def cmd_prompt(args):
    """Build a complete AI prompt from template and context.

    Gestion erreurs:
    - Template non trouvé → utilise le string directement
    - Fichiers vides → ignore silencieusement
    """
    template_text = ""
    template_path = Path(args.template)

    # Fallback to English if localized template not found
    if not template_path.exists():
        template_path = Path(str(template_path).replace('/fr/', '/en/'))

    if template_path.exists():
        try:
            template_text = template_path.read_text()
        except Exception:
            template_text = args.template  # Use as string fallback
    else:
        # Use template string directly as fallback
        template_text = args.template

    # Build prompt parts
    parts = [template_text]

    if args.files and args.files.strip():
        # Convert newlines to spaces for files list
        files_inline = ' '.join(args.files.strip().split('\n'))
        parts.append(f"\nFILES: {files_inline}")

    if args.scope and args.scope.strip():
        parts.append(f"\nSCOPE: {args.scope}")

    if args.commits and args.commits.strip():
        # Limit commits to 2000 chars
        commits_inline = ' '.join(args.commits.strip().split('\n'))[:2000]
        parts.append(f"\n\nCOMMITS: {commits_inline}")

    if args.stats and args.stats.strip():
        stats_inline = ' '.join(args.stats.strip().split('\n'))
        parts.append(f"\n\nSTATS: {stats_inline}")

    if args.diff and args.diff.strip():
        # Limit diff to 4000 chars
        diff_limited = args.diff[:4000]
        parts.append(f"\n\nDIFF:\n{diff_limited}")

    print(''.join(parts))


# ==============================================================================
# COMMAND: extract - Extract pattern from AI response
# ==============================================================================
def cmd_extract(args):
    """Extract a pattern from AI response text.

    Gestion erreurs:
    - Pattern non trouvé → retourne fallback ou première ligne non vide
    - Texte vide → retourne fallback ou chaîne vide
    - Regex invalide → retourne fallback
    """
    # Read from stdin or argument
    if args.input:
        text = args.input
    else:
        try:
            text = sys.stdin.read()
        except Exception:
            text = ""

    # Si texte vide, retourner fallback
    if not text or not text.strip():
        print(args.fallback if args.fallback else "")
        return

    # Predefined patterns
    # Note: Les patterns avec groupe capturant retournent le groupe.
    #       Les patterns sans groupe retournent le match complet.
    patterns = {
        # Retourne le message complet (pas de groupe capturant)
        'conventional-commit': r'^(?:feat|fix|docs|style|refactor|perf|test|build|ci|chore)\([a-zA-Z0-9_-]+\): .+',
        # Retourne le titre (avec ou sans préfixe "TITLE:")
        # Gère: "TITLE: xxx" ou juste la première ligne avant "---"
        'pr-title': r'^(?:TITLE:\s*)?([^\n]+?)(?=\n|$)',
        # Retourne le body après "---"
        'pr-body': r'^---$\n?([\s\S]*)',
        # Retourne la première ligne
        'first-line': r'^(.+)$',
        # Retourne la version
        'version': r'v?(\d+\.\d+\.\d+)',
        # Retourne le numéro de PR (dernier nombre sur la ligne)
        'pr-number': r'(\d+)\s*$',
        # Retourne le contenu d'un bloc de code markdown
        'code-block': r'```(?:\w+)?\n([\s\S]*?)```',
    }

    # Get pattern (predefined or custom regex)
    pattern = patterns.get(args.pattern, args.pattern)

    try:
        match = re.search(pattern, text, re.MULTILINE | re.DOTALL)
    except re.error:
        # Regex invalide → fallback
        print(args.fallback if args.fallback else "")
        return

    if match:
        # Return captured group if exists, otherwise full match
        result = match.group(1) if match.groups() else match.group(0)
        print(result.strip())
    elif args.fallback:
        print(args.fallback)
    else:
        # Fallback: first non-empty line
        lines = [l.strip() for l in text.strip().split('\n') if l.strip()]
        print(lines[0] if lines else "")


# ==============================================================================
# COMMAND: template - Variable substitution in templates
# ==============================================================================
def cmd_template(args):
    """Substitute variables in a template file.

    Gestion erreurs:
    - Fichier non trouvé → retourne chaîne vide
    - Variables manquantes → garde les placeholders (safe_substitute)
    """
    template_text = ""

    # Read template from file or stdin
    if args.file:
        try:
            template_text = Path(args.file).read_text()
        except Exception:
            template_text = ""
    else:
        try:
            template_text = sys.stdin.read()
        except Exception:
            template_text = ""

    if not template_text:
        print("")
        return

    # Build variables dictionary
    vars_dict = {}
    for var in args.var or []:
        key, _, value = var.partition('=')
        vars_dict[key] = value

    # Use string.Template for $VAR or ${VAR} substitution
    # safe_substitute ne lève jamais d'exception
    result = Template(template_text).safe_substitute(vars_dict)
    print(result)


# ==============================================================================
# COMMAND: json - JSON manipulation (lightweight jq alternative)
# ==============================================================================
def cmd_json(args):
    """Extract or manipulate JSON data.

    Gestion erreurs:
    - JSON invalide → retourne fallback ou {}
    - Clé non trouvée → retourne fallback ou null
    """
    # Read JSON from stdin or argument
    if args.input:
        text = args.input
    else:
        try:
            text = sys.stdin.read()
        except Exception:
            text = ""

    # Si texte vide, retourner fallback
    if not text or not text.strip():
        print(args.fallback if args.fallback else "{}")
        return

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        # JSON invalide → fallback
        print(args.fallback if args.fallback else "{}")
        return

    # Navigate JSON path: .key.subkey or .key[0]
    if args.extract:
        path = args.extract.lstrip('.')

        try:
            for part in path.split('.'):
                if not part:
                    continue

                # Handle array index: key[0] or [0]
                if '[' in part:
                    key, idx = part.rstrip(']').split('[')
                    if key:
                        data = data[key]
                    data = data[int(idx)]
                else:
                    data = data[part]
        except (KeyError, IndexError, TypeError):
            # Clé non trouvée → fallback
            print(args.fallback if args.fallback else "null")
            return

    # Output
    if isinstance(data, str):
        print(data)
    else:
        print(json.dumps(data, indent=2 if args.pretty else None, ensure_ascii=False))


# ==============================================================================
# COMMAND: list - Format lines as list
# ==============================================================================
def cmd_list(args):
    """Format input lines as a list with prefix/numbering.

    Gestion erreurs:
    - Texte vide → retourne chaîne vide
    """
    # Read from stdin or argument
    if args.input:
        text = args.input
    else:
        try:
            text = sys.stdin.read()
        except Exception:
            text = ""

    if not text or not text.strip():
        print("")
        return

    lines = text.strip().split('\n')

    # Apply head limit first
    if args.head and args.head > 0:
        lines = lines[:args.head]

    # Format lines
    result = []
    for i, line in enumerate(lines, 1):
        line = line.strip()
        if not line:
            continue
        if args.numbered:
            result.append(f"{i}. {line}")
        elif args.prefix:
            result.append(f"{args.prefix}{line}")
        else:
            result.append(line)

    # Output
    if args.separator:
        print(args.separator.join(result))
    else:
        print('\n'.join(result))


# ==============================================================================
# COMMAND: field - Extract field from delimited text
# ==============================================================================
def cmd_field(args):
    """Extract a field from delimited text.

    Gestion erreurs:
    - Index hors limites → retourne fallback ou chaîne vide
    - Texte vide → retourne fallback ou chaîne vide
    """
    # Read from stdin or argument
    if args.input:
        text = args.input
    else:
        try:
            text = sys.stdin.read()
        except Exception:
            text = ""

    if not text or not text.strip():
        print(args.fallback if args.fallback else "")
        return

    # Take first N lines if head specified
    lines = text.strip().split('\n')
    if args.head and args.head > 0:
        lines = lines[:args.head]

    # Work with first line only for field extraction
    line = lines[0] if lines else ""

    # Split by delimiter
    delimiter = args.delimiter if args.delimiter else "/"
    parts = line.split(delimiter)

    # Extract field by index
    index = args.index if args.index is not None else 0
    try:
        result = parts[index].strip()
    except IndexError:
        print(args.fallback if args.fallback else "")
        return

    # Apply case transformation
    if args.lowercase:
        result = result.lower()
    elif args.uppercase:
        result = result.upper()

    print(result)


# ==============================================================================
# COMMAND: clean - Clean and normalize text
# ==============================================================================
def cmd_clean(args):
    """Clean and normalize text.

    Gestion erreurs:
    - Texte vide → retourne chaîne vide
    """
    # Read from stdin or argument
    if args.input:
        text = args.input
    else:
        try:
            text = sys.stdin.read()
        except Exception:
            text = ""

    if not text:
        print("")
        return

    # Strip quotes/backticks from start and end
    if args.strip_quotes:
        # Remove leading/trailing quotes, backticks (1-3 chars)
        text = re.sub(r'^[`"\']{1,3}', '', text)
        text = re.sub(r'[`"\']{1,3}$', '', text)

    # Extract code from markdown blocks
    if args.strip_markdown:
        # Find content between ```lang and ```
        match = re.search(r'```(?:\w+)?\n([\s\S]*?)```', text)
        if match:
            text = match.group(1)

    # Trim whitespace from each line and whole text
    if args.trim:
        lines = [line.strip() for line in text.split('\n')]
        text = '\n'.join(lines).strip()

    # Collapse multiple empty lines into single
    if args.collapse_newlines:
        text = re.sub(r'\n{3,}', '\n\n', text)

    # Limit lines
    if args.max_lines and args.max_lines > 0:
        lines = text.split('\n')[:args.max_lines]
        text = '\n'.join(lines)

    print(text)


# ==============================================================================
# MAIN
# ==============================================================================
def main():
    parser = argparse.ArgumentParser(
        description='taskutil.py - Swiss Army Knife for Taskfile automation',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  # Build AI prompt
  python3 taskutil.py prompt -t prompts/fr/commit.txt --files "$FILES" --diff "$DIFF"

  # Extract conventional commit from AI response
  echo "$RESPONSE" | python3 taskutil.py extract -p conventional-commit -f "chore: update"

  # Template substitution
  python3 taskutil.py template -f config.tpl -v "NAME=myapp" -v "VERSION=1.0"

  # JSON extraction (like jq)
  echo '{"name":"test"}' | python3 taskutil.py json -e ".name" -f "unknown"

Error handling:
  - Never exits with code 1 (doesn't break workflow)
  - Always returns a value (fallback if error)
  - Errors are silent (no stderr pollution)
'''
    )
    subparsers = parser.add_subparsers(dest='command', required=True)

    # -------------------------------------------------------------------------
    # prompt
    # -------------------------------------------------------------------------
    p_prompt = subparsers.add_parser('prompt', help='Build AI prompt from template')
    p_prompt.add_argument('--template', '-t', required=True,
                          help='Template file path or string')
    p_prompt.add_argument('--files', help='Files list (newlines converted to spaces)')
    p_prompt.add_argument('--scope', help='Scope for commit message')
    p_prompt.add_argument('--diff', help='Diff content (limited to 4000 chars)')
    p_prompt.add_argument('--commits', help='Commits list for PR')
    p_prompt.add_argument('--stats', help='Diff stats for PR')

    # -------------------------------------------------------------------------
    # extract
    # -------------------------------------------------------------------------
    p_extract = subparsers.add_parser('extract', help='Extract pattern from text')
    p_extract.add_argument('--pattern', '-p', required=True,
                           help='Pattern name or regex (conventional-commit, pr-title, first-line, version)')
    p_extract.add_argument('--input', '-i', help='Input text (or stdin)')
    p_extract.add_argument('--fallback', '-f', help='Fallback value if no match')

    # -------------------------------------------------------------------------
    # template
    # -------------------------------------------------------------------------
    p_template = subparsers.add_parser('template', help='Variable substitution')
    p_template.add_argument('--file', '-f', help='Template file (or stdin)')
    p_template.add_argument('--var', '-v', action='append',
                            help='Variable in KEY=value format (can repeat)')

    # -------------------------------------------------------------------------
    # json
    # -------------------------------------------------------------------------
    p_json = subparsers.add_parser('json', help='JSON manipulation')
    p_json.add_argument('--extract', '-e', help='JSON path to extract (.key.subkey)')
    p_json.add_argument('--input', '-i', help='JSON input (or stdin)')
    p_json.add_argument('--fallback', '-f', help='Fallback value if error')
    p_json.add_argument('--pretty', action='store_true', help='Pretty print output')

    # -------------------------------------------------------------------------
    # list
    # -------------------------------------------------------------------------
    p_list = subparsers.add_parser('list', help='Format lines as list')
    p_list.add_argument('--input', '-i', help='Input text (or stdin)')
    p_list.add_argument('--prefix', '-p', help='Prefix for each line (e.g., "  • ")')
    p_list.add_argument('--numbered', '-n', action='store_true', help='Number lines (1. 2. 3.)')
    p_list.add_argument('--head', type=int, help='Limit to first N lines')
    p_list.add_argument('--separator', '-s', help='Join lines with separator instead of newlines')

    # -------------------------------------------------------------------------
    # field
    # -------------------------------------------------------------------------
    p_field = subparsers.add_parser('field', help='Extract field from delimited text')
    p_field.add_argument('--input', '-i', help='Input text (or stdin)')
    p_field.add_argument('--delimiter', '-d', default='/', help='Field delimiter (default: /)')
    p_field.add_argument('--index', type=int, default=0, help='Field index (0-based, default: 0)')
    p_field.add_argument('--head', type=int, help='Take first N lines before extraction')
    p_field.add_argument('--lowercase', '-l', action='store_true', help='Convert to lowercase')
    p_field.add_argument('--uppercase', '-u', action='store_true', help='Convert to uppercase')
    p_field.add_argument('--fallback', '-f', help='Fallback value if field not found')

    # -------------------------------------------------------------------------
    # clean
    # -------------------------------------------------------------------------
    p_clean = subparsers.add_parser('clean', help='Clean and normalize text')
    p_clean.add_argument('--input', '-i', help='Input text (or stdin)')
    p_clean.add_argument('--trim', '-t', action='store_true', help='Trim whitespace')
    p_clean.add_argument('--strip-quotes', '-q', action='store_true', help='Strip quotes/backticks')
    p_clean.add_argument('--strip-markdown', '-m', action='store_true', help='Extract code from markdown blocks')
    p_clean.add_argument('--collapse-newlines', '-c', action='store_true', help='Collapse multiple empty lines')
    p_clean.add_argument('--max-lines', type=int, help='Limit output to N lines')

    args = parser.parse_args()

    # Dispatch to command handler - wrapped in try for safety
    commands = {
        'prompt': cmd_prompt,
        'extract': cmd_extract,
        'template': cmd_template,
        'json': cmd_json,
        'list': cmd_list,
        'field': cmd_field,
        'clean': cmd_clean,
    }

    try:
        commands[args.command](args)
    except Exception:
        # Dernier recours: ne jamais planter
        print("")


if __name__ == '__main__':
    main()
