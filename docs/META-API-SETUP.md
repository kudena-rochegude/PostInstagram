# Configuration Meta API pour Instagram

## Prérequis

1. **Compte Facebook personnel** (admin)
2. **Page Facebook** liée au compte Instagram
3. **Compte Instagram Professionnel ou Créateur** (pas un compte personnel)

---

## Étape 1 : Créer l'application Meta

1. Aller sur [Meta for Developers](https://developers.facebook.com/)
2. Cliquer sur **"Mes applications"** → **"Créer une application"**
3. Sélectionner **"Autre"** → **"Entreprise"**
4. Nommer l'application : `Industrial Insta-Post`
5. Noter l'**App ID** et l'**App Secret**

---

## Étape 2 : Configurer les produits

Dans le dashboard de l'app, ajouter les produits suivants :

### Facebook Login
1. Cliquer **"Configurer"** sur Facebook Login
2. Dans **Paramètres** :
   - URI de redirection OAuth valides : `https://VOTRE-PSEUDO.github.io/`
   - Domaines autorisés : `VOTRE-PSEUDO.github.io`

### Instagram Basic Display (optionnel pour les comptes perso)
- Utile uniquement pour afficher des infos, pas pour publier

### Instagram Graph API
1. Ajouter le produit **"Instagram"**
2. C'est via ce produit que la publication fonctionne

---

## Étape 3 : Configurer les permissions

Dans **Autorisations de l'app** → **Autorisations avancées**, demander :

| Permission | Usage |
|------------|-------|
| `instagram_basic` | Lecture des infos du compte IG |
| `instagram_content_publish` | Publication de médias |
| `pages_show_list` | Liste des pages FB liées |
| `pages_read_engagement` | Lecture des interactions |

**Important** : En mode développement, ces permissions sont automatiquement accordées aux testeurs.

---

## Étape 4 : Ajouter des testeurs

1. Aller dans **Rôles** → **Rôles de l'app**
2. Cliquer **"Ajouter des testeurs"**
3. Entrer l'ID Facebook ou email des personnes à tester
4. Ces personnes doivent **accepter l'invitation** dans leurs paramètres Facebook :
   - Paramètres FB → Apps et sites web → Invitations en attente

---

## Étape 5 : Lier Instagram à une Page Facebook

### Depuis Instagram :
1. Profil → Paramètres → Compte
2. **"Passer à un compte professionnel"**
3. Choisir **Créateur** ou **Entreprise**
4. Lier à une **Page Facebook**

### Depuis Facebook :
1. Page Facebook → Paramètres
2. **"Instagram"** dans le menu
3. **"Connecter un compte"**

---

## Étape 6 : Obtenir un Long-Lived Token

### Via Graph API Explorer :

1. Aller sur [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Sélectionner votre application
3. Cliquer **"Generate Access Token"**
4. Sélectionner les permissions :
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`
5. Copier le **User Access Token**

### Échanger pour un Long-Lived Token :

```
GET https://graph.facebook.com/v18.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={app-id}
  &client_secret={app-secret}
  &fb_exchange_token={short-lived-token}
```

Ce token dure **60 jours**. À rafraîchir avant expiration.

---

## Étape 7 : Récupérer l'Instagram Account ID

```
GET https://graph.facebook.com/v18.0/me/accounts
  ?access_token={long-lived-token}
```

Réponse :
```json
{
  "data": [
    {
      "id": "PAGE_ID",
      "name": "Ma Page",
      "access_token": "PAGE_ACCESS_TOKEN"
    }
  ]
}
```

Puis :
```
GET https://graph.facebook.com/v18.0/{PAGE_ID}
  ?fields=instagram_business_account
  &access_token={page-access-token}
```

Réponse :
```json
{
  "instagram_business_account": {
    "id": "17841400000000000"  // ← C'est l'IG Account ID
  }
}
```

---

## Flux de publication Instagram

### 1. Créer un conteneur média

```
POST https://graph.facebook.com/v18.0/{ig-account-id}/media
  ?image_url={public-image-url}
  &caption={text}
  &access_token={token}
```

**Important** : L'image doit être accessible publiquement via HTTPS.

### 2. Publier le conteneur

```
POST https://graph.facebook.com/v18.0/{ig-account-id}/media_publish
  ?creation_id={container-id}
  &access_token={token}
```

---

## Limitations Mode Test

| Limite | Valeur |
|--------|--------|
| Requêtes/heure | 200 |
| Publications/jour | 25 par compte IG |
| Testeurs max | 100 |
| Durée du mode test | Illimitée |

---

## Passage en Production

Pour sortir du mode test, il faut :

1. **Vérification d'entreprise** (documents légaux)
2. **App Review** avec vidéo de démonstration
3. **Politique de confidentialité** publique
4. **Conditions d'utilisation** publiées

Délai estimé : 2-4 semaines.

---

## Dépannage

### Erreur "Invalid OAuth access token"
- Le token a expiré → Régénérer un nouveau token

### Erreur "Unsupported post request"
- Vérifier que le compte IG est bien Professionnel/Créateur
- Vérifier qu'il est lié à une Page Facebook

### Erreur "Media type not supported"
- L'image doit être JPEG ou PNG
- Taille max : 8 Mo
- Dimensions : entre 320x320 et 1440x1440

### L'image n'apparaît pas
- L'URL doit être HTTPS et publiquement accessible
- Certains hébergeurs bloquent les requêtes de Facebook

---

## Ressources

- [Documentation officielle Instagram API](https://developers.facebook.com/docs/instagram-api/)
- [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/)
