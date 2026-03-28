import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // Style pour que l'image prenne tout l'écran
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  // Le "filtre" sombre par-dessus l'image
  overlay: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Noir transparent à 50%
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff', // Blanc
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#ddd', // Gris très clair
    textAlign: 'center',
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#fff', // Blanc
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Blanc un peu transparent
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#8A2BE2', // Ton Violet demandé
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Nouveau style pour le conteneur du mot de passe (Input + Icône)
  passwordContainer: {
    flexDirection: 'row', // Aligne le texte et l'icône horizontalement
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  passwordInput: {
    flex: 1, // Prend toute la largeur disponible
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  eyeIcon: {
    paddingHorizontal: 15, // Espace pour cliquer facilement
  },
});