/* eslint-disable no-underscore-dangle */
/* eslint-disable no-undef */
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import moment from 'moment';
import memoizeOne from 'memoize-one';

import NowLine from '../NowLine/NowLine';
import Event from '../Event/Event';
import {
  EventWithMetaPropType,
  GridRowPropType,
  GridColumnPropType,
} from '../utils/types';
import { calculateDaysArray, availableNumberOfDays } from '../utils/dates';
import { topToSecondsInDay as topToSecondsInDayFromUtils } from '../utils/dimensions';
import { ViewWithTouchable } from '../utils/gestures';
import {
  VerticalDimensionContext,
  useVerticalDimensionContext,
} from '../utils/VerticalDimContext';

import DisabledRange from '../DisabledRange/DisabledRange';

import styles from './Events.styles';
import resolveEventOverlaps from '../pipeline/overlap';
import {
  computeHeight,
  computeWidth,
  computeLeft,
  computeTop,
} from '../pipeline/position';

const processEvents = (
  eventsByDate,
  initialDate,
  numberOfDays,
  rightToLeft,
) => {
  // totalEvents stores events in each day of numberOfDays
  // example: [[event1, event2], [event3, event4], [event5]], each child array
  // is events for specific day in range
  const dates = calculateDaysArray(initialDate, numberOfDays, rightToLeft);
  return dates.map((date) => resolveEventOverlaps(eventsByDate[date] || []));
};

const Lines = ({ initialDate, times, gridRowStyle }) => {
  const { timeLabelHeight } = useVerticalDimensionContext();
  const heightStyle = useAnimatedStyle(() => ({
    height: withTiming(timeLabelHeight.value),
  }));
  return times.map((time) => (
    <Animated.View
      key={`${initialDate}-${time}`}
      style={[styles.timeRow, gridRowStyle, heightStyle]}
    />
  ));
};

class Events extends PureComponent {
  topToSecondsInDay = (yValue) =>
    topToSecondsInDayFromUtils(
      yValue,
      this.context.verticalResolution,
      this.props.beginAgendaAt,
    );

  xToDayIndex = (xValue) => Math.floor(xValue / this.props.dayWidth);

  processEvents = memoizeOne(processEvents);

  /* Wrap callbacks to avoid shallow changes */
  handlePressEvent = (...args) =>
    this.props.onEventPress && this.props.onEventPress(...args);

  handleLongPressEvent = (...args) =>
    this.props.onEventLongPress && this.props.onEventLongPress(...args);

  handleGridTouch = (pressEvt, callback) => {
    if (!callback) {
      return;
    }
    const dayIndex = this.xToDayIndex(pressEvt.x);
    const secondsInDay = this.topToSecondsInDay(pressEvt.y);

    const dateWithTime = moment(this.props.initialDate)
      .add(dayIndex, 'day')
      .startOf('day')
      .seconds(secondsInDay)
      .toDate();

    callback(pressEvt, dateWithTime.getHours(), dateWithTime);
  };

  handleGridPress = (pressEvt) => {
    this.handleGridTouch(pressEvt, this.props.onGridClick);
  };

  handleGridLongPress = (pressEvt) => {
    this.handleGridTouch(pressEvt, this.props.onGridLongPress);
  };

  handleDragEvent = (event, newX, newY, eventWidth) => {
    const { onDragEvent } = this.props;
    if (!onDragEvent) {
      return;
    }

    const halfDayAnchor = Math.min(eventWidth, this.props.dayWidth) / 2;

    // NOTE: The point (newX, newY) is in the eventsColumn coordinates
    const movedDays = this.xToDayIndex(newX + halfDayAnchor);
    const secondsInDay = this.topToSecondsInDay(newY);

    const newStartDate = moment(event.startDate)
      .add(movedDays, 'days')
      .startOf('day')
      .seconds(secondsInDay)
      .toDate();

    const eventDuration = event.endDate.getTime() - event.startDate.getTime();
    const newEndDate = new Date(newStartDate.getTime() + eventDuration);

    onDragEvent(event, newStartDate, newEndDate);
  };

  handleEditEvent = (event, side, newPosition) => {
    const { onEditEvent } = this.props;
    if (!onEditEvent) {
      return;
    }

    let newStartDate = moment(event.startDate);
    let newEndDate = moment(event.endDate);

    switch (side) {
      case 'left': {
        const daysToLeft = this.xToDayIndex(newPosition);
        newStartDate = newStartDate.add(daysToLeft, 'days');
        break;
      }
      case 'right': {
        const newRightIndex = this.xToDayIndex(newPosition);
        const prevRightIndex = moment(event.endDate).diff(
          event.startDate,
          'days',
        );
        const movedRight = newRightIndex - prevRightIndex;
        newEndDate = newEndDate.add(movedRight, 'days');
        break;
      }
      case 'top': {
        newStartDate = newStartDate
          .startOf('day')
          .seconds(this.topToSecondsInDay(newPosition));
        break;
      }
      case 'bottom': {
        newEndDate = newEndDate
          .startOf('day')
          .seconds(this.topToSecondsInDay(newPosition));
        break;
      }
      default:
    }

    onEditEvent(event, newStartDate.toDate(), newEndDate.toDate());
  };

  isToday = (dayIndex) => {
    const { initialDate } = this.props;
    const today = moment();
    return moment(initialDate).add(dayIndex, 'days').isSame(today, 'day');
  };

  processDisabledDates = memoizeOne((disabledRanges, minHour, maxHour) => {
    // totalEvents stores events in each day of numberOfDays
    // example: [[event1, event2], [event3, event4], [event5]], each child array
    // is events for specific day in range
    const regularItemWidth = this.props.dayWidth;
    if (!disabledRanges) {
      return null;
    }

    const _disabledRanges = disabledRanges.map((dates) =>
      dates.map((d) => {
        const start = moment(d.startDate);
        const end = moment(d.endDate);
        if (start.hour() < minHour) {
          start.hour(minHour);
        }

        if (end.hour() > maxHour) {
          end.hour(maxHour);
        }

        const currentTop = computeTop(
          start,
          this.context.verticalResolution,
          minHour * 60,
        );

        const currentHeight = computeHeight(
          start,
          end,
          this.context.verticalResolution,
        );

        return {
          data: {
            ...d,
            color: 'grey',
            startDate: start.toDate(),
            endDate: end.toDate(),
          },
          style: {
            top: currentTop,
            left: 0,
            height: currentHeight,
            width: regularItemWidth,
          },
        };
      }),
    );
    return _disabledRanges;
  });

  render() {
    const {
      eventsByDate,
      initialDate,
      numberOfDays,
      times,
      onEventPress,
      onEventLongPress,
      eventContainerStyle,
      eventTextStyle,
      gridRowStyle,
      gridColumnStyle,
      EventComponent,
      rightToLeft,
      beginAgendaAt,
      endAgendaAt,
      showNowLine,
      nowLineColor,
      onDragEvent,
      onGridClick,
      onGridLongPress,
      dayWidth,
      pageWidth,
      onEditEvent,
      editingEventId,
      editEventConfig,
      dragEventConfig,
      disabledRanges,
    } = this.props;
    const totalEvents = this.processEvents(
      eventsByDate,
      initialDate,
      numberOfDays,
      rightToLeft,
    );

    // eslint-disable-next-line no-underscore-dangle
    const _disabledRanges = this.processDisabledDates(
      disabledRanges,
      beginAgendaAt / 60,
      endAgendaAt / 60,
    );

    return (
      <View style={[styles.container, { width: pageWidth }]}>
        <Lines
          initialDate={initialDate}
          times={times}
          gridRowStyle={gridRowStyle}
        />
        <ViewWithTouchable
          style={styles.eventsContainer}
          onPress={onGridClick && this.handleGridPress}
          onLongPress={onGridLongPress && this.handleGridLongPress}
        >
          {totalEvents.map((eventsInSection, dayIndex) => (
            <View
              style={[styles.eventsColumn, gridColumnStyle]}
              pointerEvents="box-none"
              key={`${initialDate}-${dayIndex}`}
            >
              {showNowLine && this.isToday(dayIndex) && (
                <NowLine
                  color={nowLineColor}
                  width={dayWidth}
                  beginAgendaAt={beginAgendaAt}
                />
              )}
              {_disabledRanges &&
                _disabledRanges[(moment(initialDate).day() + dayIndex) % 7] &&
                _disabledRanges[
                  (moment(initialDate).day() + dayIndex) % 7
                ].map((item, index) => (
                  <DisabledRange
                    key={`disabled-${dayIndex}-${index}`}
                    event={item.data}
                    position={item.style}
                    containerStyle={eventContainerStyle}
                  />
                ))}
              {eventsInSection.map((item) => {
                const { ref: event, box, overlap = {} } = item;
                return (
                  <Event
                    key={event.id}
                    event={event}
                    boxStartTimestamp={box.startTimestamp}
                    boxEndTimestamp={box.endTimestamp}
                    lane={overlap.lane}
                    nLanes={overlap.nLanes}
                    stackPosition={overlap.stackPosition}
                    dayWidth={dayWidth}
                    onPress={onEventPress && this.handlePressEvent}
                    onLongPress={onEventLongPress && this.handleLongPressEvent}
                    EventComponent={EventComponent}
                    containerStyle={eventContainerStyle}
                    textStyle={eventTextStyle}
                    onDrag={onDragEvent && this.handleDragEvent}
                    onEdit={onEditEvent && this.handleEditEvent}
                    editingEventId={editingEventId}
                    editEventConfig={editEventConfig}
                    dragEventConfig={dragEventConfig}
                    disabledRanges={_disabledRanges}
                  />
                );
              })}
            </View>
          ))}
        </ViewWithTouchable>
      </View>
    );
  }
}

Events.contextType = VerticalDimensionContext;

Events.propTypes = {
  numberOfDays: PropTypes.oneOf(availableNumberOfDays).isRequired,
  eventsByDate: PropTypes.objectOf(PropTypes.arrayOf(EventWithMetaPropType))
    .isRequired,
  initialDate: PropTypes.string.isRequired,
  times: PropTypes.arrayOf(PropTypes.string).isRequired,
  onEventPress: PropTypes.func,
  onEventLongPress: PropTypes.func,
  onGridClick: PropTypes.func,
  onGridLongPress: PropTypes.func,
  eventContainerStyle: PropTypes.object,
  eventTextStyle: PropTypes.object,
  gridRowStyle: GridRowPropType,
  gridColumnStyle: GridColumnPropType,
  EventComponent: PropTypes.elementType,
  rightToLeft: PropTypes.bool,
  showNowLine: PropTypes.bool,
  nowLineColor: PropTypes.string,
  beginAgendaAt: PropTypes.number,
  endAgendaAt: PropTypes.number,
  onDragEvent: PropTypes.func,
  pageWidth: PropTypes.number.isRequired,
  dayWidth: PropTypes.number.isRequired,
  onEditEvent: PropTypes.func,
  editingEventId: PropTypes.string,
  disabledRanges: PropTypes.arrayOf(
    PropTypes.arrayOf(DisabledRange.propTypes.event),
  ),
};

export default Events;
