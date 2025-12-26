⏺ Fichier de test créé avec 3 conflits de merge :

  test-conflict.ts
  ├── Conflit 1: Définition de l'interface User (ligne 5-12)
  ├── Conflit 2: Fonction greetUser (ligne 15-25)
  └── Conflit 3: Fonction validateEmail (ligne 28-42)

  Pour tester l'extension :

  # 1. Ouvrir VS Code dans le dossier de l'extension
  code /Users/d3nai/PROJECTS/bullshit/git-ext

  2. Appuyer sur F5 pour lancer l'extension en mode développement
  3. Dans la nouvelle fenêtre VS Code qui s'ouvre :
    - Ouvrir le fichier test-conflict.ts
    - Cmd+Shift+P → taper "Git Merge Wizard: Open Merge Editor"

  Ou utiliser le raccourci : Cmd+Alt+M

  Tu verras l'interface 3 panneaux avec :
  - Gauche : version HEAD (actuelle)
  - Centre : résultat éditable
  - Droite : version feature/user-updates (incoming)