import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    position: 'absolute',
    borderRadius: 0,
    flex: 1,
  },
  description: {
    marginVertical: 8,
    marginHorizontal: 2,
    color: '#fff',
    textAlign: 'center',
    fontSize: 15,
  },
});

const circleDiameter = 15;
const baseCircleStyle = {
  position: 'absolute',
  borderColor: '#F8D33C',
  backgroundColor: 'hsla(48, 93%, 60%, 0.5)',
  borderWidth: 2,
  borderRadius: circleDiameter,
  height: circleDiameter,
  // width: 40,
  // backgroundColor: 'white',
};

export const circleStyles = StyleSheet.create({
  top: {
    ...baseCircleStyle,
    left: 0,
    right: 0,
    top: -circleDiameter / 2,
  },
  bottom: {
    ...baseCircleStyle,
    left: 0,
    right: 0,
    bottom: -circleDiameter / 2,
  },
  left: {
    ...baseCircleStyle,
    left: -circleDiameter / 2,
    top: '50%',
  },
  right: {
    ...baseCircleStyle,
    right: -circleDiameter / 2,
    top: '50%',
  },
});

export default styles;
