# Industrial Insta-Post

MVP de publication Instagram automatisée pour clients industriels.

## Architecture

```
┌─────────────────┐     HTTPS      ┌─────────────────┐
│   GitHub Pages  │ ──────────────▶│    n8n Cloud    │
│   (Front-end)   │                │   (Backend)     │
└─────────────────┘                └────────┬────────┘
                                            │
                              ┌─────────────┼─────────────┐
                              │             │             │
                              ▼             ▼             ▼
                        ┌──────────┐  ┌──────────┐  ┌──────────┐
                        │ OpenAI   │  │ Meta API │  │ Storage  │
                        │ GPT-4o   │  │Instagram │  │ (images) │
                        └──────────┘  └──────────┘  └──────────┘
```

## Structure du projet

```
.
├── webapp/                 # Front-end PWA
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── manifest.json
│   ├── sw.js
│   └── icons/             # Icônes PWA (à créer)
├── n8n/
│   └── workflow-insta-post.json   # Workflow à importer
├── docs/
│   └── META-API-SETUP.md  # Guide configuration Meta
└── README.md
```

## Déploiement

### 1. Front-end sur GitHub Pages

```bash
# Créer un repo GitHub
gh repo create industrial-insta-post --public

# Pousser le code
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/VOTRE-PSEUDO/industrial-insta-post.git
git push -u origin main

# Activer GitHub Pages
# Settings → Pages → Source: Deploy from branch → main → /webapp
```

URL finale : `https://VOTRE-PSEUDO.github.io/industrial-insta-post/`

### 2. Workflow n8n

1. Ouvrir n8n Cloud
2. **Import Workflow** → Coller le contenu de `n8n/workflow-insta-post.json`
3. Configurer les credentials :
   - **OpenAI** : Ajouter votre clé API
4. **Activer** le workflow
5. Copier l'URL du webhook : `https://VOTRE-INSTANCE.app.n8n.cloud/webhook/insta-post`

### 3. Configuration de l'app

Éditer `webapp/app.js` :

```javascript
const CONFIG = {
    N8N_WEBHOOK_URL: 'https://VOTRE-INSTANCE.app.n8n.cloud/webhook/insta-post',
    FB_APP_ID: 'VOTRE_APP_ID',
    // ...
};
```

### 4. Meta API

Suivre le guide : [docs/META-API-SETUP.md](docs/META-API-SETUP.md)

## Flux utilisateur

1. **Connexion** : OAuth Facebook
2. **Capture** : Photo via caméra smartphone
3. **Analyse** : GPT-4o Vision génère la légende
4. **Validation** : Modification manuelle possible
5. **Publication** : Envoi vers Instagram via API Graph

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Clé API OpenAI (dans n8n credentials) |
| `FB_APP_ID` | ID de l'application Meta |
| `FB_APP_SECRET` | Secret de l'app (stocké côté serveur uniquement) |

## CORS

Le workflow n8n inclut les headers CORS nécessaires :

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

Pour la production, remplacer `*` par `https://VOTRE-PSEUDO.github.io`.

## Limitations MVP

- Mode test Meta : max 100 testeurs
- Publications : 25/jour par compte Instagram
- Tokens : expiration 60 jours (refresh manuel)
- Images : doivent être hébergées sur URL publique HTTPS

## Créer les icônes PWA

Utilisez un générateur comme [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator) avec une image 512x512.

Tailles requises : 72, 96, 128, 144, 152, 192, 384, 512 pixels.

## Troubleshooting

### La caméra ne s'ouvre pas
- Vérifier que le site est en HTTPS
- Autoriser les permissions caméra dans le navigateur

### Erreur CORS
- Vérifier l'URL du webhook dans `app.js`
- Vérifier que le workflow n8n est actif

### "Invalid OAuth access token"
- Régénérer le token Facebook (expire après 60 jours)

### Publication échoue
- Vérifier que le compte Instagram est Professionnel/Créateur
- Vérifier la liaison avec une Page Facebook

## Roadmap

- [ ] Stockage d'images sur Cloudinary/S3
- [ ] Refresh automatique des tokens
- [ ] Support vidéo/Reels
- [ ] Analytics des publications
- [ ] Multi-comptes
