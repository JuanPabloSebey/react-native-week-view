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
    startDate: generateDates(0, 0),
    endDate: generateDates(2, 0),
    color: 'blue',
  },
  {
    id: 2,
    description: 'Event 2',
    startDate: generateDates(1, 0),
    endDate: generateDates(4, 0),
    color: 'red',
  },
  {
    id: 3,
    description: 'Event 3',
    startDate: generateDates(-5, 0),
    endDate: generateDates(-3, 0),
    color: 'green',
  },
];

const sampleFixedEvents = [
  {
    id: 1,
    description: 'Event 1',
    startDate: createFixedWeekDate('Monday', 12),
    endDate: createFixedWeekDate(1, 14),
    color: 'blue',
  },
  {
    id: 2,
    description: 'Event 2',
    startDate: createFixedWeekDate('wed', 16),
    endDate: createFixedWeekDate(3, 17, 30),
    color: 'red',
  },
];

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
    events: showFixedComponent ? sampleFixedEvents : sampleEvents,
    selectedDate: new Date(),
  };

  componentDidMount() {
    console.log('ASDADASDASDASDASD')
    const asd = async () => {
      const granted = await PermissionsAndroid.request(
        'android.permission.VIBRATE',
        {
          title: "Cool Photo App Camera Permission",
          message:
            "Cool Photo App needs access to your camera " +
            "so you can take awesome pictures.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK"
        }
      );
      console.log('GRANTED', granted)
    }
    asd()
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
    // Here you should update the event in your DB with the new date and hour
    this.setState({
      events: [
        ...this.state.events.filter(e => e.id !== event.id),
        {
          ...event,
          startDate: newStartDate,
          endDate: newEndDate,
        },
      ],
    });
  };

  onTimeIntervalSelected = (startTime, endTime) => {
    console.log(`start: ${startTime}`, `end: ${endTime}`);
  };

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
            hoursInDisplay={12}
            timeStep={60}
            startHour={8}
            fixedHorizontally={showFixedComponent}
            showTitle={!showFixedComponent}
            showNowLine
            onDragEvent={this.onDragEvent}
            isRefreshing={false}
            RefreshComponent={MyRefreshComponent}
            formatTimeLabel={'HH:mm'}
            locale={'es'}
            onTimeIntervalSelected={this.onTimeIntervalSelected}
            showClickedSlot
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
