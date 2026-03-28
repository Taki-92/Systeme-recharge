import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)', // Fond sombre transparent pour effet modal
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
    position: 'relative', // Pour placer le bouton fermer en absolu
  },
  closeButton: {
    position: 'absolute',
    top: -20,
    right: -20,
    backgroundColor: '#333',
    borderRadius: 20,
    padding: 5,
  },
  title: {
    fontSize: 18,
    color: '#666',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  plugId: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#8A2BE2', // Violet thème
    marginBottom: 20,
  },
  infoContainer: {
    marginBottom: 30,
  },
  description: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  activateButton: {
    backgroundColor: '#8A2BE2',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#8A2BE2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 5,
  },
  activateButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  loaderText: {
    fontSize: 16,
    color: '#8A2BE2',
    fontWeight: '600',
  },
});