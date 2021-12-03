/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
} from 'react-native';
import moment from 'moment';

import WeekView, { createFixedWeekDate, addLocale } from 'react-native-week-view';

const generateDates = (hours, minutes) => {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  if (minutes != null) {
    date.setMinutes(minutes);
  }
  return date;
};

const sampleEvents = [
  {
    id: 1,
    description: 'Event 1',
    startDate: moment().startOf('day').add(1, 'day').add(10, 'hours').add(0, 'minutes').toDate(),
    endDate: moment().startOf('day').add(1, 'day').add(11, 'hours').add(15, 'minutes').toDate(),
    color: 'blue',
  },
  {
    id: 2,
    description: 'Event 2',
    startDate: moment().startOf('day').add(1, 'day').add(12, 'hours').add(45, 'minutes').toDate(),
    endDate: moment().startOf('day').add(1, 'day').add(13, 'hours').add(30, 'minutes').toDate(),
    color: 'red',
  },
  {
    id: 3,
    description: 'Event 3',
    startDate: moment().startOf('day').add(1, 'day').add(8, 'hours').add(0, 'minutes').toDate(),
    endDate: moment().startOf('day').add(1, 'day').add(9, 'hours').add(0, 'minutes').toDate(),
    color: 'green',
  },
];

const _disabledDates = [
  [
    {
      id: 1,
      startDate: moment().subtract(1, 'day').startOf('day').add(0, 'hours').add(0, 'minutes').toDate(),
      endDate: moment().subtract(1, 'day').startOf('day').add(9, 'hours').add(0, 'minutes').toDate(),
      color: 'lightgrey',
    },
    {
      id: 2,
      startDate: moment().subtract(1, 'day').startOf('day').add(14, 'hours').add(0, 'minutes').toDate(),
      endDate: moment().subtract(1, 'day').startOf('day').add(23, 'hours').add(0, 'minutes').toDate(),
      color: 'lightgrey',
    }
  ],
  [
    {
      id: 3,
      startDate: moment().subtract(1, 'day').startOf('day').add(14, 'hours').add(0, 'minutes').toDate(),
      endDate: moment().subtract(1, 'day').startOf('day').add(16, 'hours').add(0, 'minutes').toDate(),
      color: 'lightgrey',
    }
  ],
  [],
  [],
  [],
  [],
  [{
    id: 4,
    startDate: moment().subtract(1, 'day').startOf('day').add(19, 'hours').add(0, 'minutes').toDate(),
    endDate: moment().subtract(1, 'day').startOf('day').add(23, 'hours').add(0, 'minutes').toDate(),
    color: 'lightgrey',
  }],
]

const selection = {
  id: 4,
  startDate: moment().subtract(1, 'day').startOf('day').add(12, 'hours').add(14, 'minutes').toDate(),
  endDate: moment().subtract(1, 'day').startOf('day').add(13, 'hours').add(21, 'minutes').toDate(),
  color: 'lightgrey',
}

addLocale('es', {
  months: [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ],
  monthsShort: [
    'ENE',
    'FEB',
    'MAR',
    'ABR',
    'MAY',
    'JUN',
    'JUL',
    'AGO',
    'SEP',
    'OCT',
    'NOV',
    'DIC',
  ],
  weekdays: [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
  ],
  weekdaysMin: ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA'],
});

// For debugging purposes
const showFixedComponent = false;

const MyRefreshComponent = ({ style }) => (
  // Just an example
  <ActivityIndicator style={style} color="red" size="large" />
);

class App extends React.Component {
  state = {
    events: sampleEvents,
    selectedDate: new Date(),
    disabledDates: _disabledDates
  };

  componentDidMount() {

  }

  onEventPress = ({ id, color, startDate, endDate }) => {
    Alert.alert(
      `event ${color} - ${id}`,
      `start: ${startDate}\nend: ${endDate}`,
    );
  };

  onGridClick = (event, startHour, date) => {
    const dateStr = date.toISOString().split('T')[0];
    /* Alert.alert(`Date: ${dateStr}\nStart hour: ${startHour}`); */
  };

  onDragEvent = (event, newStartDate, newEndDate) => {
    /* console.log('STATE EVENT', moment(this.state.events.filter(e => e.id === event.id)[0].startDate).format('DD HH:mm'))
    console.log('STATE CHANG', moment(newStartDate).format('DD HH:mm'))
    console.log('=====================================================================') */
    // Here you should update the event in your DB with the new date and hour
    const newEvents = this.state.events.filter(e => e.id !== event.id).slice()
    newEvents.push({
      ...event,
      startDate: newStartDate,
      endDate: newEndDate,
    })
    this.setState({
      events: newEvents,
    });
  };

  onTimeIntervalSelected = (startTime, endTime) => {
    console.log(`start: ${startTime}`, `end: ${endTime}`);
  };

  handleOnSelecting = (start, end) => {
    if (moment(start).isBefore(moment(start).startOf('day').add(9, 'hour'))) {
      return false
    }
    return true
  }

  render() {
    const { events, selectedDate } = this.state;
    return (
      <>
        <StatusBar barStyle="dark-content" />
        <SafeAreaView style={styles.container}>
          <WeekView
            ref={r => {
              this.componentRef = r;
            }}
            events={events}
            selectedDate={selectedDate}
            numberOfDays={3}
            onEventPress={this.onEventPress}
            onGridClick={this.onGridClick}
            headerStyle={styles.header}
            headerTextStyle={styles.headerText}
            headerTextDateStyle={styles.headerTextDate}
            hourTextStyle={styles.hourText}
            eventContainerStyle={styles.eventContainer}
            formatDateHeader={showFixedComponent ? 'ddd' : 'ddd DD'}
            hoursInDisplay={8}
            timeStep={60}
            startHour={8}
            fixedHorizontally={showFixedComponent}
            showTitle={!showFixedComponent}
            showNowLine
            /* onDragEvent={this.onDragEvent} */
            isRefreshing={false}
            RefreshComponent={MyRefreshComponent}
            formatTimeLabel={'HH:mm'}
            locale={'es'}
            onTimeIntervalSelected={this.onTimeIntervalSelected}
            showClickedSlot
            minHour={8}
            maxHour={22}
            onSelecting={this.handleOnSelecting}
            disabledRanges={this.state.disabledDates}
            selection={selection}
          />
        </SafeAreaView>
      </>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    backgroundColor: '#4286f4',
    borderColor: '#fff',
  },
  headerText: {
    color: 'white',
  },
  headerTextDate: {
    color: '#333333',
    marginVertical: 8,
  },
  hourText: {
    color: 'black',
  },
  eventContainer: {
    borderWidth: 1,
    borderColor: 'black',
  },
});

export default App;
