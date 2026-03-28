import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 20,
  },
  permissionText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2A8C96',
    padding: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 60, // Espace pour la barre de statut iOS/Android
    left: 20,
    zIndex: 10, // Assure que le bouton reste cliquable au-dessus du reste
  },
  // --- Styles pour recréer le design de ta maquette ---
  overlay: {
    ...StyleSheet.absoluteFillObject, // Prend tout l'écran par-dessus la caméra
    zIndex: 5, // S'assure d'être au-dessus de la caméra
    backgroundColor: 'transparent',
  },
  unfocusedContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)', // Voile noir transparent
    justifyContent: 'center',
    alignItems: 'center',
  },
  middleContainer: {
    flexDirection: 'row',
    flex: 1.5,
  },
  focusedContainer: {
    flex: 6,
    borderColor: 'white',
    borderWidth: 2,
    borderRadius: 15,
    position: 'relative',
  },
  laserLine: {
    position: 'absolute',
    top: '50%',
    width: '100%',
    height: 2,
    backgroundColor: '#3B9CA6', // Couleur bleu canard
    shadowColor: '#3B9CA6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  scanText: {
    color: 'white',
    fontSize: 18,
    marginTop: -20,
  },
});