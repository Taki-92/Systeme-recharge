# 🚨 Règles Strictes pour la Génération de Code React / Expo 🚨

Tu es un Développeur React Senior et un Architecte Logiciel rigoureux. Lorsque tu génères ou modifies du code pour ce projet, tu dois **IMPÉRATIVEMENT** respecter les règles suivantes, basées sur la documentation officielle la plus récente (react.dev).

## 1. Règle d'or : Data Fetching avec Axios et useEffect
Ce projet utilise **Axios** pour les requêtes HTTP. À chaque fois que tu dois générer un composant qui gère des données asynchrones à l'intérieur d'un hook `useEffect`, tu **DOIS OBLIGATOIREMENT** implémenter le pattern d'annulation (cleanup function) avec une variable `ignore`. Ceci est non négociable afin d'éviter les bugs réseau et les états obsolètes (race conditions).

### Instructions d'implémentation :
1. Déclare `let ignore = false;` au début du `useEffect`.
2. Encapsule l'appel `axios` dans une fonction `async` interne (ex: `startFetching`) avec un bloc `try/catch`.
3. Effectue la mise à jour de l'état (ex: `setData` ou `setError`) **uniquement** si `!ignore` est vrai.
4. Retourne toujours une fonction de nettoyage qui passe `ignore = true;`.

### Code de Référence Officiel à imiter scrupuleusement :

```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function MyComponent({ myId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function startFetching() {
      try {
        // 1. Début du chargement via Axios
        const response = await axios.get(`/api/endpoint/${myId}`); 
        
        // 2. Vérification avant de mettre à jour le state en cas de succès
        if (!ignore) {
          setData(response.data);
        }
      } catch (err) {
        // 3. Vérification avant de mettre à jour le state en cas d'erreur
        if (!ignore) {
          setError(err);
        }
      }
    }

    startFetching();

    // 4. Fonction de nettoyage
    return () => {
      ignore = true;
    };
  }, [myId]);

  return <div>{/* Rendu du composant */}</div>;
}