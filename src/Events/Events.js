import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Animated, PanResponder, Text, TouchableWithoutFeedback, View, Vibration } from 'react-native';
import moment from 'moment';
import memoizeOne from 'memoize-one';

import NowLine from '../NowLine/NowLine';
import Event from '../Event/Event';
import {
  CONTAINER_HEIGHT,
  CONTAINER_WIDTH,
  calculateDaysArray,
  DATE_STR_FORMAT,
  availableNumberOfDays,
  minutesToYDimension,
  CONTENT_OFFSET,
  getTimeLabelHeight,
} from '../utils';

import styles from './Events.styles';

const MINUTES_IN_HOUR = 60;
const EVENT_HORIZONTAL_PADDING = 15;
const EVENTS_CONTAINER_WIDTH = CONTAINER_WIDTH - EVENT_HORIZONTAL_PADDING;
const MIN_ITEM_WIDTH = 4;
const ALLOW_OVERLAP_SECONDS = 2;

const areEventsOverlapped = (event1EndDate, event2StartDate) => {
  const endDate = moment(event1EndDate);
  endDate.subtract(ALLOW_OVERLAP_SECONDS, 'seconds');
  return endDate.isSameOrAfter(event2StartDate);
};

const getStyleForEvent = (event, regularItemWidth, hoursInDisplay) => {
  const startDate = moment(event.startDate);
  const startHours = startDate.hours();
  const startMinutes = startDate.minutes();
  const totalStartMinutes = startHours * MINUTES_IN_HOUR + startMinutes;
  const top = minutesToYDimension(hoursInDisplay, totalStartMinutes);
  const deltaMinutes = moment(event.endDate).diff(event.startDate, 'minutes');
  const height = minutesToYDimension(hoursInDisplay, deltaMinutes);

  return {
    top: top + CONTENT_OFFSET,
    left: 0,
    height,
    width: regularItemWidth,
  };
};

const addOverlappedToArray = (baseArr, overlappedArr, itemWidth) => {
  // Given an array of overlapped events (with style), modifies their style to overlap them
  // and adds them to a (base) array of events.
  if (!overlappedArr) return;

  const nOverlapped = overlappedArr.length;
  if (nOverlapped === 0) {
    return;
  }
  if (nOverlapped === 1) {
    baseArr.push(overlappedArr[0]);
    return;
  }

  let nLanes;
  let horizontalPadding;
  let indexToLane;
  if (nOverlapped === 2) {
    nLanes = nOverlapped;
    horizontalPadding = 3;
    indexToLane = (index) => index;
  } else {
    // Distribute events in multiple lanes
    const maxLanes = nOverlapped;
    const latestByLane = {};
    const laneByEvent = {};
    overlappedArr.forEach((event, index) => {
      for (let lane = 0; lane < maxLanes; lane += 1) {
        const lastEvtInLaneIndex = latestByLane[lane];
        const lastEvtInLane =
          (lastEvtInLaneIndex || lastEvtInLaneIndex === 0) &&
          overlappedArr[lastEvtInLaneIndex];
        if (
          !lastEvtInLane ||
          !areEventsOverlapped(
            lastEvtInLane.data.endDate,
            event.data.startDate,
          )
        ) {
          // Place in this lane
          latestByLane[lane] = index;
          laneByEvent[index] = lane;
          break;
        }
      }
    });

    nLanes = Object.keys(latestByLane).length;
    horizontalPadding = 2;
    indexToLane = (index) => laneByEvent[index];
  }
  const dividedWidth = itemWidth / nLanes;
  const width = Math.max(dividedWidth - horizontalPadding, MIN_ITEM_WIDTH);

  overlappedArr.forEach((eventWithStyle, index) => {
    const { data, style } = eventWithStyle;
    baseArr.push({
      data,
      style: {
        ...style,
        width,
        left: dividedWidth * indexToLane(index),
      },
    });
  });
};

const getEventsWithPosition = (totalEvents, regularItemWidth, hoursInDisplay) => {
  return totalEvents.map((events) => {
    let overlappedSoFar = []; // Store events overlapped until now
    let lastDate = null;
    const eventsWithStyle = events.reduce((eventsAcc, event) => {
      const style = getStyleForEvent(event, regularItemWidth, hoursInDisplay);
      const eventWithStyle = {
        data: event,
        style,
      };

      if (!lastDate || areEventsOverlapped(lastDate, event.startDate)) {
        overlappedSoFar.push(eventWithStyle);
        const endDate = moment(event.endDate);
        lastDate = lastDate ? moment.max(endDate, lastDate) : endDate;
      } else {
        addOverlappedToArray(
          eventsAcc,
          overlappedSoFar,
          regularItemWidth,
        );
        overlappedSoFar = [eventWithStyle];
        lastDate = moment(event.endDate);
      }
      return eventsAcc;
    }, []);
    addOverlappedToArray(
      eventsWithStyle,
      overlappedSoFar,
      regularItemWidth,
    );
    return eventsWithStyle;
  });
};

class Events extends PureComponent {
  constructor(props) {
    super(props);

    this.offset = getTimeLabelHeight(
      this.props.hoursInDisplay,
      this.props.timeStep,
    );

    this.state = {
      dayIndex: null,
      hour: 0,
      topTimeIndex: 0,
      bottomTimeIndex: 4,
    };

    this.height = React.createRef();
    this.height.current = this.offset;
    this.heightAnim = new Animated.Value(this.height.current);

    this.panTopButton = new Animated.ValueXY();
    this.panBottomButton = new Animated.ValueXY();

    this.topButtonPosition = new Animated.Value(0);

    this.panTopButtonResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, gestureState) => {
        /* Vibration.vibrate(100); */
        console.log('TOP', this.state.topTimeIndex, (this.state.topTimeIndex / 4) * this.offset)
        this.panTopButton.setValue({
          x: 0,
          y: (this.state.topTimeIndex) * this.offset / 4,
        });
      },
      onPanResponderMove: (_, gestureState) => {
        const _topIndex = Math.floor(
          (4 * (((this.state.bottomTimeIndex / 4) * this.offset)
            - this.height.current
            + gestureState.dy) / this.offset)
        )

        if (_topIndex >= this.state.bottomTimeIndex || _topIndex === this.state.topTimeIndex) {
          return
        }

        this.panTopButton.setValue({
          x: 0,
          y: (_topIndex) * this.offset / 4,
        });

        this.setState({
          topTimeIndex: _topIndex,
        });
        const newHeight = (this.state.bottomTimeIndex - _topIndex) * (this.offset / 4)
        this.heightAnim.setValue(newHeight === 0 ? 1 : newHeight);
      },
      onPanResponderRelease: (_, gestureState) => {
        this.height.current = (this.state.bottomTimeIndex - this.state.topTimeIndex) * (this.offset / 4);
        this.panTopButton.flattenOffset();
      },
      onPanResponderTerminationRequest: () => false,
    });

    this.panBottomButtonResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        /* Vibration.vibrate(100); */
        this.panBottomButton.setOffset({
          x: 0,
          y: this.panBottomButton.y._value,
        });
      },
      onPanResponderMove: (_, gestureState) => {

        const _bottomIndex = Math.floor(
          (4 * (((this.state.topTimeIndex / 4) * this.offset)
            + this.height.current
            + gestureState.dy) / this.offset)
        )

        if (_bottomIndex <= this.state.topTimeIndex || _bottomIndex === this.state.bottomTimeIndex) {
          return
        }

        this.setState({
          bottomTimeIndex: _bottomIndex,
        });
        this.panBottomButton.setValue({
          x: gestureState.dx,
          y: _bottomIndex * this.offset / 4,
        });

        const newHeight = (_bottomIndex - this.state.topTimeIndex) * (this.offset / 4)
        this.heightAnim.setValue(newHeight);
      },
      onPanResponderRelease: (_, gestureState) => {
        this.height.current = (this.state.bottomTimeIndex - this.state.topTimeIndex) * (this.offset / 4);
        this.panBottomButton.flattenOffset();
      },
      onPanResponderTerminationRequest: () => false,
    });
  };

  componentDidUpdate = (_, prevState) => {
    if (
      prevState.topTimeIndex !== this.state.topTimeIndex ||
      prevState.bottomTimeIndex !== this.state.bottomTimeIndex
    ) {
      this.props.onTimeIntervalSelected &&
        this.props.onTimeIntervalSelected(
          this.state.topTimeIndex,
          this.state.bottomTimeIndex,
        )
    }
  };

  yToHour = (y) => {
    const { hoursInDisplay } = this.props;
    const hour = (y * hoursInDisplay) / CONTAINER_HEIGHT;
    return hour;
  };

  getEventItemWidth = (padded = true) => {
    const { numberOfDays } = this.props;
    const fullWidth = padded ? EVENTS_CONTAINER_WIDTH : CONTAINER_WIDTH;
    return fullWidth / numberOfDays;
  };

  processEvents = memoizeOne(
    (eventsByDate, initialDate, numberOfDays, hoursInDisplay, rightToLeft) => {
      // totalEvents stores events in each day of numberOfDays
      // example: [[event1, event2], [event3, event4], [event5]], each child array
      // is events for specific day in range
      const dates = calculateDaysArray(initialDate, numberOfDays, rightToLeft);
      const totalEvents = dates.map((date) => {
        const dateStr = date.format(DATE_STR_FORMAT);
        return eventsByDate[dateStr] || [];
      });

      const regularItemWidth = this.getEventItemWidth();

      const totalEventsWithPosition = getEventsWithPosition(
        totalEvents,
        regularItemWidth,
        hoursInDisplay,
      );
      return totalEventsWithPosition;
    },
  );

  onGridTouch = (event, dayIndex, longPress) => {
    console.log('onGridTouch')
    const { initialDate, onGridClick, onGridLongPress } = this.props;
    const callback = longPress ? onGridLongPress : onGridClick;
    if (!callback) {
      return;
    }
    const { locationY } = event.nativeEvent;
    const hour = Math.floor(this.yToHour(locationY - CONTENT_OFFSET));

    const date = moment(initialDate).add(dayIndex, 'day').toDate();

    this.setState({
      dayIndex,
      hour,
      topTimeIndex: 4 * hour,
      bottomTimeIndex: 4 * (hour + 1),
    });

    this.heightAnim.setValue(this.offset);
    this.panTopButton.y.setValue(hour * this.offset);
    this.height.current = this.offset;

    callback(event, hour, date);
  };

  onDragEvent = (event, newX, newY) => {
    const { onDragEvent } = this.props;
    if (!onDragEvent) {
      return;
    }

    const movedDays = Math.floor(newX / this.getEventItemWidth());

    const startTime = event.startDate.getTime();
    const newStartDate = new Date(startTime);
    newStartDate.setDate(newStartDate.getDate() + movedDays);

    let newMinutes = this.yToHour(newY - CONTENT_OFFSET) * 60;
    const newHour = Math.floor(newMinutes / 60);
    newMinutes %= 60;
    newStartDate.setHours(newHour, newMinutes);

    const newEndDate = new Date(
      newStartDate.getTime() + event.originalDuration,
    );

    onDragEvent(event, newStartDate, newEndDate);
  };

  isToday = (dayIndex) => {
    const { initialDate } = this.props;
    const today = moment();
    return moment(initialDate).add(dayIndex, 'days').isSame(today, 'day');
  };

  render() {
    const {
      eventsByDate,
      initialDate,
      numberOfDays,
      times,
      onEventPress,
      onEventLongPress,
      eventContainerStyle,
      EventComponent,
      rightToLeft,
      hoursInDisplay,
      timeStep,
      showNowLine,
      nowLineColor,
      showClickedSlot,
      onDragEvent,
    } = this.props;
    const totalEvents = this.processEvents(
      eventsByDate,
      initialDate,
      numberOfDays,
      hoursInDisplay,
      rightToLeft,
    );

    return (
      <View style={styles.container}>
        {times.map((time) => (
          <View
            key={time}
            style={[
              styles.timeRow,
              { height: getTimeLabelHeight(hoursInDisplay, timeStep) },
            ]}
          >
            <View style={styles.timeLabelLine} />
          </View>
        ))}
        <View style={styles.eventsContainer}>
          {totalEvents.map((eventsInSection, dayIndex) => (
            <TouchableWithoutFeedback
              onPress={(e) => this.onGridTouch(e, dayIndex, false)}
              onLongPress={(e) => this.onGridTouch(e, dayIndex, true)}
              key={dayIndex}
            >
              <View style={styles.eventsColumn}>
                {showNowLine && this.isToday(dayIndex) && (
                  <NowLine
                    color={nowLineColor}
                    hoursInDisplay={hoursInDisplay}
                    width={this.getEventItemWidth(false)}
                  />
                )}
                {eventsInSection.map((item) => (
                  <Event
                    key={item.data.id}
                    event={item.data}
                    position={item.style}
                    onPress={onEventPress}
                    onLongPress={onEventLongPress}
                    EventComponent={EventComponent}
                    containerStyle={eventContainerStyle}
                    onDrag={onDragEvent && this.onDragEvent}
                  />
                ))}
              </View>
            </TouchableWithoutFeedback>
          ))}
          {showClickedSlot && (
            <TouchableWithoutFeedback onPress={() => { }}>
              <Animated.View
                style={[
                  {
                    // FIX Replaced 60 = WIDTH
                    position: 'absolute',
                    left: 1 + ((CONTAINER_WIDTH / numberOfDays) * this.state.dayIndex),
                    top: 17 + this.panTopButton.y._value,
                    width: (CONTAINER_WIDTH / numberOfDays) - 15,
                    borderWidth: 2,
                    borderColor: '#F00',
                    borderRadius: 3,
                    height: this.heightAnim,
                    zIndex: 1000,
                  },
                ]}>
                <Animated.View
                  style={{
                    position: 'absolute',
                    top: this.topButtonPosition,
                    left: 10,
                    width: 20,
                    height: 20,
                    backgroundColor: '#FE41C8',
                    borderRadius: 6,
                    zIndex: 100000,
                  }}
                  {...this.panTopButtonResponder.panHandlers}
                />
                <Animated.View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 20,
                    height: 16,
                    backgroundColor: '#DD6390',
                    borderTopLeftRadius: 10,
                    borderColor: 'rgb(231, 173, 195)',
                    borderWidth: 0,
                  }}
                  {...this.panBottomButtonResponder.panHandlers}
                />
              </Animated.View>
            </TouchableWithoutFeedback>
          )}
        </View>
      </View>
    );
  }
}

Events.propTypes = {
  numberOfDays: PropTypes.oneOf(availableNumberOfDays).isRequired,
  eventsByDate: PropTypes.objectOf(PropTypes.arrayOf(Event.propTypes.event))
    .isRequired,
  initialDate: PropTypes.string.isRequired,
  hoursInDisplay: PropTypes.number.isRequired,
  timeStep: PropTypes.number.isRequired,
  times: PropTypes.arrayOf(PropTypes.string).isRequired,
  onEventPress: PropTypes.func,
  onEventLongPress: PropTypes.func,
  onGridClick: PropTypes.func,
  onGridLongPress: PropTypes.func,
  eventContainerStyle: PropTypes.object,
  EventComponent: PropTypes.elementType,
  rightToLeft: PropTypes.bool,
  showNowLine: PropTypes.bool,
  nowLineColor: PropTypes.string,
  onDragEvent: PropTypes.func,
};

export default Events;
