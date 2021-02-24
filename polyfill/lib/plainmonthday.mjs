/* global __debug__ */

import { ES } from './ecmascript.mjs';
import { DateTimeFormat } from './intl.mjs';
import { GetIntrinsic, MakeIntrinsicClass } from './intrinsicclass.mjs';
import {
  CALENDAR_RECORD,
  CreateSlots,
  GetSlot,
  ISO_DAY,
  ISO_MONTH,
  ISO_YEAR,
  MONTH_DAY_BRAND,
  SetSlot
} from './slots.mjs';

const ObjectAssign = Object.assign;

function MonthDayToString(monthDay, showCalendar = 'auto') {
  const month = ES.ISODateTimePartString(GetSlot(monthDay, ISO_MONTH));
  const day = ES.ISODateTimePartString(GetSlot(monthDay, ISO_DAY));
  let resultString = `${month}-${day}`;
  const calendarRecord = GetSlot(monthDay, CALENDAR_RECORD);
  const calendarID = ES.CalendarToString(calendarRecord);
  if (calendarID !== 'iso8601') {
    const year = ES.ISOYearString(GetSlot(monthDay, ISO_YEAR));
    resultString = `${year}-${resultString}`;
  }
  const calendarString = ES.FormatCalendarAnnotation(calendarID, showCalendar);
  if (calendarString) resultString += calendarString;
  return resultString;
}

export class PlainMonthDay {
  constructor(isoMonth, isoDay, calendar = ES.GetISO8601Calendar(), referenceISOYear = 1972) {
    isoMonth = ES.ToInteger(isoMonth);
    isoDay = ES.ToInteger(isoDay);
    let calendarRecord;
    if (ES.IsCalendarRecord(calendar)) {
      calendarRecord = calendar;
      calendar = calendar.object;
    } else {
      calendar = ES.ToTemporalCalendar(calendar);
    }
    referenceISOYear = ES.ToInteger(referenceISOYear);

    // Note: if the arguments are not passed, ToInteger(undefined) will have returned 0, which will
    //       be rejected by RejectDate below. This check exists only to improve the error message.
    if (arguments.length < 2) {
      throw new RangeError('missing argument: isoMonth and isoDay are required');
    }

    ES.RejectISODate(referenceISOYear, isoMonth, isoDay);
    ES.RejectDateRange(referenceISOYear, isoMonth, isoDay);
    if (!calendarRecord) calendarRecord = ES.NewCalendarRecord(calendar);

    CreateSlots(this);
    SetSlot(this, ISO_MONTH, isoMonth);
    SetSlot(this, ISO_DAY, isoDay);
    SetSlot(this, ISO_YEAR, referenceISOYear);
    SetSlot(this, CALENDAR_RECORD, calendarRecord);
    SetSlot(this, MONTH_DAY_BRAND, true);

    if (typeof __debug__ !== 'undefined' && __debug__) {
      Object.defineProperty(this, '_repr_', {
        value: `${this[Symbol.toStringTag]} <${MonthDayToString(this)}>`,
        writable: false,
        enumerable: false,
        configurable: false
      });
    }
  }

  get monthCode() {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
    return ES.CalendarMonthCode(GetSlot(this, CALENDAR_RECORD), this);
  }
  get day() {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
    return ES.CalendarDay(GetSlot(this, CALENDAR_RECORD), this);
  }
  get calendar() {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
    return GetSlot(this, CALENDAR_RECORD).object;
  }

  with(temporalMonthDayLike, options = undefined) {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
    if (ES.Type(temporalMonthDayLike) !== 'Object') {
      throw new TypeError('invalid argument');
    }
    if (temporalMonthDayLike.calendar !== undefined) {
      throw new TypeError('with() does not support a calendar property');
    }
    if (temporalMonthDayLike.timeZone !== undefined) {
      throw new TypeError('with() does not support a timeZone property');
    }

    const calendarRecord = GetSlot(this, CALENDAR_RECORD);
    const fieldNames = ES.CalendarFields(calendarRecord, ['day', 'month', 'monthCode', 'year']);
    const props = ES.ToPartialRecord(temporalMonthDayLike, fieldNames);
    if (!props) {
      throw new TypeError('invalid month-day-like');
    }
    let fields = ES.ToTemporalMonthDayFields(this, fieldNames);
    fields = ES.CalendarMergeFields(calendarRecord, fields, props);

    options = ES.NormalizeOptionsObject(options);

    const Construct = ES.SpeciesConstructor(this, PlainMonthDay);
    const result = ES.CalendarMonthDayFromFields(calendarRecord, fields, options, Construct);
    if (!ES.IsTemporalMonthDay(result)) throw new TypeError('invalid result');
    return result;
  }
  equals(other) {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
    other = ES.ToTemporalMonthDay(other, PlainMonthDay);
    for (const slot of [ISO_MONTH, ISO_DAY, ISO_YEAR]) {
      const val1 = GetSlot(this, slot);
      const val2 = GetSlot(other, slot);
      if (val1 !== val2) return false;
    }
    return ES.CalendarEquals(GetSlot(this, CALENDAR_RECORD), GetSlot(other, CALENDAR_RECORD));
  }
  toString(options = undefined) {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
    options = ES.NormalizeOptionsObject(options);
    const showCalendar = ES.ToShowCalendarOption(options);
    return MonthDayToString(this, showCalendar);
  }
  toJSON() {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
    return MonthDayToString(this);
  }
  toLocaleString(locales = undefined, options = undefined) {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
    return new DateTimeFormat(locales, options).format(this);
  }
  valueOf() {
    throw new TypeError('use equals() to compare Temporal.PlainMonthDay');
  }
  toPlainDate(item) {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
    const calendarRecord = GetSlot(this, CALENDAR_RECORD);

    const receiverFieldNames = ES.CalendarFields(calendarRecord, ['day', 'monthCode']);
    const fields = ES.ToTemporalMonthDayFields(this, receiverFieldNames);

    const inputFieldNames = ES.CalendarFields(calendarRecord, ['year']);
    const entries = [['year']];
    // Add extra fields from the calendar at the end
    inputFieldNames.forEach((fieldName) => {
      if (!entries.some(([name]) => name === fieldName)) {
        entries.push([fieldName, undefined]);
      }
    });
    ObjectAssign(fields, ES.PrepareTemporalFields(item, entries));

    const Date = GetIntrinsic('%Temporal.PlainDate%');
    return ES.CalendarDateFromFields(calendarRecord, fields, {}, Date);
  }
  getISOFields() {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
    return {
      calendar: GetSlot(this, CALENDAR_RECORD).object,
      isoDay: GetSlot(this, ISO_DAY),
      isoMonth: GetSlot(this, ISO_MONTH),
      isoYear: GetSlot(this, ISO_YEAR)
    };
  }
  static from(item, options = undefined) {
    options = ES.NormalizeOptionsObject(options);
    if (ES.IsTemporalMonthDay(item)) {
      ES.ToTemporalOverflow(options); // validate and ignore
      const month = GetSlot(item, ISO_MONTH);
      const day = GetSlot(item, ISO_DAY);
      const calendar = GetSlot(item, CALENDAR_RECORD).object;
      const referenceISOYear = GetSlot(item, ISO_YEAR);
      const result = new this(month, day, calendar, referenceISOYear);
      if (!ES.IsTemporalMonthDay(result)) throw new TypeError('invalid result');
      return result;
    }
    return ES.ToTemporalMonthDay(item, this, options);
  }
}

MakeIntrinsicClass(PlainMonthDay, 'Temporal.PlainMonthDay');
