import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA', // Fond très clair
  },
  header: {
    backgroundColor: '#8A2BE2', // Couleur violette (comme index.tsx)
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    paddingTop: 60, // Espace pour la barre de statut (l'heure, batterie...)
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  topIcons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  rightIcons: {
    flexDirection: 'row',
  },
  iconMargin: {
    marginRight: 20,
  },
  balanceContainer: {
    alignItems: 'center',
  },
  balanceText: {
    fontSize: 34,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  rechargeButton: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 35,
    borderRadius: 25,
  },
  rechargeButtonText: {
    color: '#8A2BE2', // Texte de la même couleur que le fond de l'en-tête
    fontSize: 16,
    fontWeight: 'bold',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanWrapper: {
    alignItems: 'center',
  },
  scanButton: {
    backgroundColor: '#8A2BE2', // Violet (comme index.tsx)
    width: 130,
    height: 130,
    borderRadius: 30, // Forme carré arrondi du design
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5, // Ombre pour Android
    marginBottom: 15,
  },
  scanText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  // --- Styles pour le Menu Modal ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Fond semi-transparent
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  menuCloseButton: {
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  menuTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  menuItem: {
    width: '100%',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  logoutText: {
    color: '#D32F2F', // Rouge pour la déconnexion
    fontWeight: 'bold',
  },
});