import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  InteractionManager,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import moment from 'moment';
import memoizeOne from 'memoize-one';

import Events from '../Events/Events';
import Header from '../Header/Header';
import Title from '../Title/Title';
import Times from '../Times/Times';
import VerticalAgenda from '../VerticalAgenda/VerticalAgenda';
import styles from './WeekView.styles';
import bucketEventsByDate from '../pipeline/box';
import {
  HorizontalSyncFlatList,
  HeaderRefContextProvider,
} from '../utils/HorizontalScroll';
import {
  DATE_STR_FORMAT,
  availableNumberOfDays,
  availableSteps,
  setLocale,
} from '../utils/dates';
import { mod } from '../utils/misc';
import { computeHorizontalDimensions } from '../utils/dimensions';
import {
  GridRowPropType,
  GridColumnPropType,
  EditEventConfigPropType,
  EventPropType,
  PageStartAtOptionsPropType,
  DragEventConfigPropType,
} from '../utils/types';
import {
  PAGES_OFFSET,
  calculatePagesDates,
  getRawDayOffset,
  DEFAULT_WINDOW_SIZE,
} from '../utils/pages';
import { RunGesturesOnJSContext } from '../utils/gestures';
import { VerticalDimensionsProvider } from '../utils/VerticalDimContext';

/** For some reason, this sign is necessary in all cases. */
const VIEW_OFFSET_SIGN = -1;

const identity = (item) => item;
const MINUTES_IN_DAY = 60 * 24;
const calculateTimesArray = (
  minutesStep,
  formatTimeLabel,
  beginAt = 0,
  endAt = MINUTES_IN_DAY,
) => {
  const times = [];
  const startOfDay = moment().startOf('day');
  for (
    let timer = beginAt >= 0 && beginAt < MINUTES_IN_DAY ? beginAt : 0;
    timer < endAt && timer < MINUTES_IN_DAY;
    timer += minutesStep
  ) {
    const time = startOfDay.clone().minutes(timer);
    times.push(time.format(formatTimeLabel));
  }

  return times;
};

export default class WeekView extends Component {
  constructor(props) {
    super(props);
    this.eventsGrid = React.createRef();
    this.verticalAgenda = React.createRef();
    this.currentPageIndex = 0;

    const initialDates = [moment(props.selectedDate).format(DATE_STR_FORMAT)];
    const { width: windowWidth, height: windowHeight } =
      Dimensions.get('window');
    this.state = {
      // currentMoment should always be the first date of the current page
      currentMoment: moment(initialDates[this.currentPageIndex]).toDate(),
      initialDates,
      windowWidth,
      windowHeight,
    };

    setLocale(props.locale);

    this.dimensions = {};
  }

  componentDidMount() {
    requestAnimationFrame(() => {
      this.scrollToVerticalStart();
    });

    this.windowListener = Dimensions.addEventListener(
      'change',
      ({ window }) => {
        const { width: windowWidth, height: windowHeight } = window;
        this.setState({ windowWidth, windowHeight });
      },
    );
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.locale !== prevProps.locale) {
      setLocale(this.props.locale);
    }
    if (this.props.numberOfDays !== prevProps.numberOfDays) {
      /**
       * HOTFIX: linter rules no-access-state-in-setstate and no-did-update-set-state
       * are disabled here for now.
       * TODO: apply a better solution for the `currentMoment` and `initialDates` logic,
       * without using componentDidUpdate()
       */
      const initialDates = calculatePagesDates(
        // eslint-disable-next-line react/no-access-state-in-setstate
        this.state.currentMoment,
        this.props.numberOfDays,
        this.props.pageStartAt,
        this.props.prependMostRecent,
      );

      this.currentPageIndex = PAGES_OFFSET;
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState(
        {
          currentMoment: moment(initialDates[this.currentPageIndex]).toDate(),
          initialDates,
        },
        () => {
          this.eventsGrid.current.scrollToIndex({
            index: PAGES_OFFSET,
            animated: false,
          });
        },
      );
    }
    if (this.state.windowWidth !== prevState.windowWidth) {
      // NOTE: after a width change, the position may be off by a few days
      this.eventsGrid.current.scrollToIndex({
        index: this.currentPageIndex,
        animated: false,
      });
    }
  }

  componentWillUnmount() {
    if (this.windowListener) {
      this.windowListener.remove();
    }
  }

  calculateTimes = memoizeOne(calculateTimesArray);

  scrollToVerticalStart = () => {
    this.scrollToTime(this.props.startHour * 60, { animated: false });
  };

  scrollToTime = (minutes, options = {}) => {
    if (this.verticalAgenda.current) {
      this.verticalAgenda.current.scrollToTime(minutes, options);
    }
  };

  handleTimeScrolled = (secondsInDay) => {
    const { onTimeScrolled } = this.props;

    if (!onTimeScrolled) {
      return;
    }
    const date = moment(this.state.currentMoment)
      .startOf('day')
      .seconds(secondsInDay)
      .toDate();

    onTimeScrolled(date);
  };

  isAppendingTheFuture = () => !this.props.prependMostRecent;

  getSignToTheFuture = () => (this.isAppendingTheFuture() ? 1 : -1);

  goToNextPage = () => {
    if (!this.state.initialDates) {
      return;
    }
    this.goToPageIndex(
      moment(this.state.initialDates[this.currentPageIndex]).add(
        this.props.numberOfDays,
        'days',
      ),
    );
  };

  goToPrevPage = () => {
    if (!this.state.initialDates) {
      return;
    }
    this.goToPageIndex(
      moment(this.state.initialDates[this.currentPageIndex]).subtract(
        this.props.numberOfDays,
        'days',
      ),
    );
  };

  /**
   * Computes the left-offset displayed in the current date.
   *
   * Helper method used in goToPageIndex()
   * */
  getCurrentDayOffset = () => {
    const { initialDates, currentMoment } = this.state;

    return moment(currentMoment).diff(
      initialDates[this.currentPageIndex],
      'day',
    );
  };

  /**
   * Navigates the view to a pageIndex and (optional) dayOffset.
   *
   * Adds more pages (if necessary), scrolls the List to the new index,
   * and updates this.currentPageIndex.
   *
   * @param {Number} targetPageIndex between (-infinity, infinity) indicating target page.
   * @param {Number} targetDayOffset day offset inside a page.
   *     Only used if allowScrollByDay is true.
   */
  goToPageIndex = (dateMoment) => {
    this.setState(
      {
        initialDates: [dateMoment.format(DATE_STR_FORMAT)], // fecha a la que me muevo
        currentMoment: dateMoment.toDate(), // Fecha a la que me muevo,
      },
      () =>
        // setTimeout is used to force calling scroll after UI is updated
        setTimeout(() => {
          this.eventsGrid.current.scrollToIndex({
            index: 0,
            viewOffset: 0,
            animated: false,
          });
          this.currentPageIndex = 0;
        }, 0),
    );
  };

  bucketEventsByDate = memoizeOne(bucketEventsByDate);

  getListItemLayout = (item, index) => {
    const pageWidth = this.dimensions.pageWidth || 0;
    return {
      length: pageWidth,
      offset: pageWidth * index,
      index,
    };
  };

  render() {
    const {
      showTitle = true,
      numberOfDays,
      headerStyle,
      headerTextStyle,
      hourTextStyle,
      hourContainerStyle,
      gridRowStyle,
      gridColumnStyle,
      eventContainerStyle,
      eventTextStyle,
      allDayEventContainerStyle,
      AllDayEventComponent,
      DayHeaderComponent,
      TodayHeaderComponent,
      formatDateHeader,
      timesColumnWidth,
      onEventPress,
      onEventLongPress,
      events = [],
      hoursInDisplay = 6,
      timeStep = 60,
      beginAgendaAt = 0,
      endAgendaAt = MINUTES_IN_DAY,
      formatTimeLabel = 'H:mm',
      allowScrollByDay = false,
      onGridClick,
      onGridLongPress,
      onEditEvent,
      editEventConfig,
      editingEvent,
      enableVerticalPinch = false,
      EventComponent,
      prependMostRecent = false,
      rightToLeft = false,
      fixedHorizontally,
      showNowLine,
      nowLineColor,
      dragEventConfig,
      onDragEvent,
      onMonthPress,
      onDayPress,
      isRefreshing,
      RefreshComponent = ActivityIndicator,
      windowSize = DEFAULT_WINDOW_SIZE,
      initialNumToRender = DEFAULT_WINDOW_SIZE,
      maxToRenderPerBatch = PAGES_OFFSET,
      updateCellsBatchingPeriod = 50,
      removeClippedSubviews = true,
      disableVirtualization = false,
      runOnJS = false,
      onTimeScrolled,
      disabledRanges,
      step,
    } = this.props;
    const { currentMoment, initialDates, windowWidth, windowHeight } =
      this.state;
    const times = this.calculateTimes(
      timeStep,
      formatTimeLabel,
      beginAgendaAt,
      endAgendaAt,
    );
    const {
      regularEvents: eventsByDate,
      allDayEvents,
      computeMaxVisibleLanesInHeader,
    } = this.bucketEventsByDate(events);
    const horizontalInverted =
      (prependMostRecent && !rightToLeft) ||
      (!prependMostRecent && rightToLeft);

    const { pageWidth, dayWidth, timeLabelsWidth } =
      computeHorizontalDimensions(windowWidth, numberOfDays, timesColumnWidth);

    this.dimensions = {
      dayWidth,
      pageWidth,
    };

    const horizontalScrollProps = allowScrollByDay
      ? {
          decelerationRate: 'fast',
          snapToInterval: dayWidth,
        }
      : {
          pagingEnabled: true,
        };
    return (
      <GestureHandlerRootView style={styles.container}>
        <HeaderRefContextProvider>
          <View style={styles.headerAndTitleContainer}>
            <Title
              showTitle={showTitle}
              style={headerStyle}
              textStyle={headerTextStyle}
              currentDate={currentMoment}
              onMonthPress={onMonthPress}
              width={timeLabelsWidth}
            />
            <Header
              numberOfDays={numberOfDays}
              currentDate={currentMoment}
              allDayEvents={allDayEvents}
              initialDates={initialDates}
              formatDate={formatDateHeader}
              style={headerStyle}
              textStyle={headerTextStyle}
              eventContainerStyle={allDayEventContainerStyle}
              EventComponent={AllDayEventComponent}
              TodayComponent={TodayHeaderComponent}
              DayComponent={DayHeaderComponent}
              rightToLeft={rightToLeft}
              computeMaxVisibleLanes={computeMaxVisibleLanesInHeader}
              onDayPress={onDayPress}
              onEventPress={onEventPress}
              onEventLongPress={onEventLongPress}
              dayWidth={dayWidth}
              horizontalInverted={horizontalInverted}
              getListItemLayout={this.getListItemLayout}
              windowSize={windowSize}
              initialNumToRender={initialNumToRender}
              maxToRenderPerBatch={maxToRenderPerBatch}
              updateCellsBatchingPeriod={updateCellsBatchingPeriod}
            />
          </View>
          {isRefreshing && RefreshComponent && (
            <RefreshComponent
              style={[
                styles.loadingSpinner,
                { right: pageWidth / 2, top: windowHeight / 2 },
              ]}
            />
          )}
          <VerticalDimensionsProvider
            enableVerticalPinch={enableVerticalPinch}
            hoursInDisplay={hoursInDisplay}
            beginAgendaAt={beginAgendaAt}
            endAgendaAt={endAgendaAt}
            timeStep={timeStep}
          >
            <VerticalAgenda
              onTimeScrolled={onTimeScrolled && this.handleTimeScrolled}
              ref={this.verticalAgenda}
            >
              <View style={styles.scrollViewChild}>
                <Times
                  times={times}
                  containerStyle={hourContainerStyle}
                  textStyle={hourTextStyle}
                  width={timeLabelsWidth}
                />
                <RunGesturesOnJSContext.Provider value={runOnJS}>
                  <HorizontalSyncFlatList
                    data={initialDates}
                    getItemLayout={this.getListItemLayout}
                    keyExtractor={identity}
                    initialScrollIndex={PAGES_OFFSET}
                    scrollEnabled={!fixedHorizontally}
                    horizontal
                    // eslint-disable-next-line react/jsx-props-no-spreading
                    {...horizontalScrollProps}
                    inverted={horizontalInverted}
                    ref={this.eventsGrid}
                    windowSize={windowSize}
                    initialNumToRender={initialNumToRender}
                    maxToRenderPerBatch={maxToRenderPerBatch}
                    updateCellsBatchingPeriod={updateCellsBatchingPeriod}
                    removeClippedSubviews={removeClippedSubviews}
                    disableVirtualization={disableVirtualization}
                    accessible
                    accessibilityLabel="Grid with horizontal scroll"
                    accessibilityHint="Grid with horizontal scroll"
                    renderItem={({ item }) => {
                      return (
                        <Events
                          times={times}
                          eventsByDate={eventsByDate}
                          initialDate={item}
                          numberOfDays={numberOfDays}
                          onEventPress={onEventPress}
                          onEventLongPress={onEventLongPress}
                          onGridClick={onGridClick}
                          onGridLongPress={onGridLongPress}
                          beginAgendaAt={beginAgendaAt}
                          endAgendaAt={endAgendaAt}
                          EventComponent={EventComponent}
                          eventContainerStyle={eventContainerStyle}
                          eventTextStyle={eventTextStyle}
                          gridRowStyle={gridRowStyle}
                          gridColumnStyle={gridColumnStyle}
                          rightToLeft={rightToLeft}
                          showNowLine={showNowLine}
                          nowLineColor={nowLineColor}
                          onDragEvent={onDragEvent}
                          pageWidth={pageWidth}
                          dayWidth={dayWidth}
                          onEditEvent={onEditEvent}
                          editingEventId={editingEvent}
                          editEventConfig={editEventConfig}
                          dragEventConfig={dragEventConfig}
                          disabledRanges={disabledRanges}
                          step={step}
                        />
                      );
                    }}
                  />
                </RunGesturesOnJSContext.Provider>
              </View>
            </VerticalAgenda>
          </VerticalDimensionsProvider>
        </HeaderRefContextProvider>
      </GestureHandlerRootView>
    );
  }
}

WeekView.propTypes = {
  events: PropTypes.arrayOf(EventPropType),
  formatDateHeader: PropTypes.string,
  numberOfDays: PropTypes.oneOf(availableNumberOfDays).isRequired,
  timesColumnWidth: PropTypes.number,
  pageStartAt: PageStartAtOptionsPropType,
  onSwipeNext: PropTypes.func,
  onSwipePrev: PropTypes.func,
  onTimeScrolled: PropTypes.func,
  onEventPress: PropTypes.func,
  onEventLongPress: PropTypes.func,
  onGridClick: PropTypes.func,
  onGridLongPress: PropTypes.func,
  editingEvent: PropTypes.string,
  onEditEvent: PropTypes.func,
  editEventConfig: EditEventConfigPropType,
  dragEventConfig: DragEventConfigPropType,
  enableVerticalPinch: PropTypes.bool,
  headerStyle: PropTypes.object,
  headerTextStyle: PropTypes.object,
  hourTextStyle: PropTypes.object,
  hourContainerStyle: PropTypes.object,
  eventContainerStyle: PropTypes.object,
  eventTextStyle: PropTypes.object,
  allDayEventContainerStyle: PropTypes.object,
  gridRowStyle: GridRowPropType,
  gridColumnStyle: GridColumnPropType,
  selectedDate: PropTypes.instanceOf(Date).isRequired,
  locale: PropTypes.string,
  hoursInDisplay: PropTypes.number,
  allowScrollByDay: PropTypes.bool,
  timeStep: PropTypes.number,
  beginAgendaAt: PropTypes.number,
  endAgendaAt: PropTypes.number,
  formatTimeLabel: PropTypes.string,
  startHour: PropTypes.number,
  AllDayEventComponent: PropTypes.elementType,
  EventComponent: PropTypes.elementType,
  DayHeaderComponent: PropTypes.elementType,
  TodayHeaderComponent: PropTypes.elementType,
  showTitle: PropTypes.bool,
  rightToLeft: PropTypes.bool,
  fixedHorizontally: PropTypes.bool,
  prependMostRecent: PropTypes.bool,
  showNowLine: PropTypes.bool,
  nowLineColor: PropTypes.string,
  onDragEvent: PropTypes.func,
  onMonthPress: PropTypes.func,
  onDayPress: PropTypes.func,
  isRefreshing: PropTypes.bool,
  RefreshComponent: PropTypes.elementType,
  windowSize: PropTypes.number,
  initialNumToRender: PropTypes.number,
  maxToRenderPerBatch: PropTypes.number,
  updateCellsBatchingPeriod: PropTypes.number,
  removeClippedSubviews: PropTypes.bool,
  disableVirtualization: PropTypes.bool,
  runOnJS: PropTypes.bool,
  disabledRanges: Events.propTypes.disabledRanges,
  step: PropTypes.oneOf(availableSteps),
};
