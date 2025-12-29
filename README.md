# VibeMerge

Un éditeur de merge 3-way puissant pour VS Code, inspiré d'IntelliJ IDEA.

## Installation

### Option 1 : Depuis le fichier .vsix (recommandé)

1. Télécharge le fichier `git-merge-wizard-x.x.x.vsix` depuis les Releases du repo
2. Dans VS Code, ouvre la palette de commandes (`Cmd+Shift+P` / `Ctrl+Shift+P`)
3. Tape "Extensions: Install from VSIX..."
4. Sélectionne le fichier `.vsix` téléchargé
5. Redémarre VS Code

### Option 2 : Build depuis les sources

```bash
# Clone le repo
git clone <url-du-repo>
cd git-ext

# Installe les dépendances
bun install

# Compile
bun run compile

# Crée le package
bunx @vscode/vsce package --allow-missing-repository

# Installe le .vsix généré via VS Code (voir Option 1)
```

## Utilisation

### Raccourcis clavier

| Raccourci | Action |
|-----------|--------|
| `Cmd+Alt+M` (Mac) / `Ctrl+Alt+M` (Win/Linux) | Ouvrir l'éditeur de merge |
| `Cmd+Shift+←` / `Ctrl+Shift+←` | Accepter le changement de gauche (Current) |
| `Cmd+Shift+→` / `Ctrl+Shift+→` | Accepter le changement de droite (Incoming) |

### Commandes disponibles

Ouvre la palette de commandes (`Cmd+Shift+P`) et tape "VibeMerge" :

- **Open Merge Editor** : Ouvre l'éditeur de merge pour le fichier actuel
- **Resolve All Conflicts** : Résout automatiquement tous les conflits
- **Accept Current (Left)** : Accepte la version actuelle
- **Accept Incoming (Right)** : Accepte la version entrante
- **Accept Both Changes** : Garde les deux versions

### Workflow typique

1. Quand tu as un conflit git, ouvre le fichier en conflit
2. Utilise `Cmd+Alt+M` pour ouvrir l'éditeur de merge
3. Tu verras 3 panneaux :
   - **Gauche** : Ta version actuelle (Current/HEAD)
   - **Centre** : Le résultat final (Result)
   - **Droite** : La version entrante (Incoming)
4. Clique sur les boutons `<<` ou `>>` pour accepter les changements
5. Modifie directement le panneau central si nécessaire
6. Sauvegarde quand tu as fini

## Configuration

Dans les paramètres VS Code (`Cmd+,`), recherche "VibeMerge" :

| Paramètre | Description | Défaut |
|-----------|-------------|--------|
| `autoApplyNonConflicting` | Applique auto les changements non-conflictuels | `true` |
| `showLineNumbers` | Affiche les numéros de ligne | `true` |
| `highlightSyntax` | Active la coloration syntaxique | `true` |
| `syncScroll` | Synchronise le scroll entre les panneaux | `true` |

## Fonctionnalités

- Vue 3 panneaux (Current / Result / Incoming)
- Navigation entre les conflits
- Boutons pour accepter gauche/droite/les deux
- Scroll synchronisé
- Coloration syntaxique
- Numéros de ligne
- Application automatique des changements non-conflictuels

## Développement

```bash
# Mode watch (recompile automatiquement)
bun run watch

# Lancer en mode debug
# Appuie sur F5 dans VS Code pour lancer l'Extension Development Host
```

## License

MIT
