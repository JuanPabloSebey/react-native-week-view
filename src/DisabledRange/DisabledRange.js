import React from 'react';
import PropTypes from 'prop-types';
import styles from './DisabledRange.styles';
import { View } from 'react-native';

const DisabledRange = ({
  event,
  position,
}) => {

  return (
    <View
      pointerEvents={'none'}
      style={[
        styles.container,
        {
          top: position.top,
          left: position.left,
          height: position.height,
          width: position.width,
          backgroundColor: event.color,
        },
      ]}

    >
    </View>
  );
};

const disabledPropType = PropTypes.shape({
  color: PropTypes.string,
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  dayIndex: PropTypes.number,
  startHour: PropTypes.instanceOf(Date),
  endHour: PropTypes.instanceOf(Date),
});

const positionPropType = PropTypes.shape({
  height: PropTypes.number,
  width: PropTypes.number,
  top: PropTypes.number,
  left: PropTypes.number,
});

DisabledRange.propTypes = {
  event: disabledPropType,
  position: positionPropType,
  containerStyle: PropTypes.object,
  EventComponent: PropTypes.elementType,
};

export default DisabledRange;
