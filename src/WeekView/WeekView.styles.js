import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollViewChild: {
    flexDirection: 'row',
  },
  headerAndTitleContainer: {
    flexDirection: 'row',
    height:50
  },
  loadingSpinner: {
    position: 'absolute',
    zIndex: 2,
  },
});

export default styles;
