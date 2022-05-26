import classNames from 'classnames';
import useMergedState from 'rc-util/lib/hooks/useMergedState';
import React, { Fragment, useEffect, useRef, useState } from 'react';
import type { PickerPanelProps } from '..';
import { PICKER_PREFIX_CLS } from '../constant';
import { ResultContext } from '../context';
import type { GenerateConfig } from '../generate';
import useRangeDisabled from '../hooks/useRangeDisabled';
import useRangeViewDates from '../hooks/useRangeViewDates';
import type { DisabledTimes, EventValue, PanelMode, PickerMode, RangeValue } from '../interface';
import PanelContext from '../PanelContext';
import type { DateRender } from '../panels/DatePanel/DateBody';
import type { SharedTimeProps } from '../panels/TimePanel';
import type { PickerBaseProps, PickerDateProps, PickerTimeProps } from '../Picker';
import PickerPanel from '../PickerPanel';
import RangeContext from '../RangeContext';
import RangeResult from '../result/range';
import ShortCutPanel from '../ShortCutPanel';
import {
  formatValue,
  getClosingViewDate,
  isEqual,
  isSameDate,
  isSameQuarter,
  isSameWeek,
} from '../utils/dateUtil';
import getExtraFooter from '../utils/getExtraFooter';
import { getValue, toArray, updateValues } from '../utils/miscUtil';
import { getDefaultFormat } from '../utils/uiUtil';
import './index.less';

function reorderValues<DateType>(
  values: RangeValue<DateType>,
  generateConfig: GenerateConfig<DateType>,
): RangeValue<DateType> {
  if (values && values[0] && values[1] && generateConfig.isAfter(values[0], values[1])) {
    return [values[1], values[0]];
  }

  return values;
}

function canValueTrigger<DateType>(
  value: EventValue<DateType>,
  index: number,
  disabled: [boolean, boolean],
  allowEmpty?: [boolean, boolean] | null,
): boolean {
  if (value) {
    return true;
  }

  if (allowEmpty && allowEmpty[index]) {
    return true;
  }

  if (disabled[(index + 1) % 2]) {
    return true;
  }

  return false;
}

export type RangeType = 'start' | 'end';

export type RangeInfo = {
  range: RangeType;
};

export type RangeDateRender<DateType> = (
  currentDate: DateType,
  today: DateType,
  info: RangeInfo,
) => React.ReactNode;

export type RangePickerPanelSharedProps<DateType> = {
  id?: string;
  value?: RangeValue<DateType>;
  defaultValue?: RangeValue<DateType>;
  defaultPickerValue?: [DateType, DateType];
  disabled?: boolean | [boolean, boolean];
  disabledTime?: (date: EventValue<DateType>, type: RangeType) => DisabledTimes;
  ranges?: Record<
    string,
    Exclude<RangeValue<DateType>, null> | (() => Exclude<RangeValue<DateType>, null>)
  >;

  allowEmpty?: [boolean, boolean];
  mode?: [PanelMode, PanelMode];
  onChange?: (values: RangeValue<DateType>, formatString: [string, string]) => void;
  onCalendarChange?: (
    values: RangeValue<DateType>,
    formatString: [string, string],
    info: RangeInfo,
  ) => void;
  onPanelChange?: (values: RangeValue<DateType>, modes: [PanelMode, PanelMode]) => void;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onOk?: (dates: RangeValue<DateType>) => void;
  direction?: 'ltr' | 'rtl';

  /** @private Internal control of active picker. Do not use since it's private usage */
  activePickerIndex?: 0 | 1;
  dateRender?: RangeDateRender<DateType>;
  panelRender?: ((originPanel: React.ReactNode) => React.ReactNode)[];
};

type OmitPickerProps<Props> = Omit<
  Props,
  | 'value'
  | 'defaultValue'
  | 'defaultPickerValue'
  | 'placeholder'
  | 'disabled'
  | 'disabledTime'
  | 'showToday'
  | 'showTime'
  | 'mode'
  | 'onChange'
  | 'onSelect'
  | 'onPanelChange'
  | 'pickerValue'
  | 'onPickerValueChange'
  | 'onOk'
  | 'dateRender'
>;

type RangeShowTimeObject<DateType> = Omit<SharedTimeProps<DateType>, 'defaultValue'> & {
  defaultValue?: DateType[];
};

export type RangePickerBaseProps<DateType> = {} & RangePickerPanelSharedProps<DateType> &
  OmitPickerProps<PickerBaseProps<DateType>>;

export type RangePickerDateProps<DateType> = {
  showTime?: boolean | RangeShowTimeObject<DateType>;
} & RangePickerPanelSharedProps<DateType> &
  OmitPickerProps<PickerDateProps<DateType>>;

export type RangePickerTimeProps<DateType> = {
  order?: boolean;
} & RangePickerPanelSharedProps<DateType> &
  OmitPickerProps<PickerTimeProps<DateType>>;

export type RangePickerProps<DateType> =
  | RangePickerBaseProps<DateType>
  | RangePickerDateProps<DateType>
  | RangePickerTimeProps<DateType>;

// TMP type to fit for ts 3.9.2
type OmitType<DateType> = Omit<RangePickerBaseProps<DateType>, 'picker'> &
  Omit<RangePickerDateProps<DateType>, 'picker'> &
  Omit<RangePickerTimeProps<DateType>, 'picker'>;

type MergedRangePickerProps<DateType> = {
  picker?: PickerMode;
} & OmitType<DateType>;

function RangePickerPanel<DateType>(props: RangePickerProps<DateType>) {
  const {
    prefixCls = PICKER_PREFIX_CLS,
    generateConfig,
    locale,
    disabled,
    format,
    picker = 'date',
    showTime,
    use12Hours,
    value,
    defaultValue,
    defaultPickerValue,
    disabledDate,
    disabledTime,
    dateRender,
    ranges,
    allowEmpty,
    mode,
    renderExtraFooter,
    onChange,
    onPanelChange,
    onCalendarChange,
    components,
    order,
    direction,
    activePickerIndex,
  } = props as MergedRangePickerProps<DateType>;

  // const needConfirmButton: boolean = (picker === 'date' && !!showTime) || picker === 'time';
  const needConfirmButton = false;

  // We record opened status here in case repeat open with picker
  const openRecordsRef = useRef<Record<number, boolean>>({});

  const panelDivRef = useRef<HTMLDivElement>(null);
  const startInputDivRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);

  // ============================ Warning ============================
  // if (process.env.NODE_ENV !== 'production') {
  //   legacyPropsWarning(props);
  // }

  // ============================= Misc ==============================
  const formatList = toArray(getDefaultFormat<DateType>(format, picker, showTime, use12Hours));

  // Active picker
  const [mergedActivePickerIndex, setMergedActivePickerIndex] = useMergedState<0 | 1>(0, {
    value: activePickerIndex,
  });

  const mergedDisabled = React.useMemo<[boolean, boolean]>(() => {
    if (Array.isArray(disabled)) {
      return disabled;
    }

    return [disabled || false, disabled || false];
  }, [disabled]);

  // ============================= Value =============================
  const [mergedValue, setInnerValue] = useMergedState<RangeValue<DateType>>(null, {
    value,
    defaultValue,
    postState: (values) =>
      picker === 'time' && !order ? values : reorderValues(values, generateConfig),
  });

  // =========================== View Date ===========================
  // Config view panel
  const [getViewDate, setViewDate] = useRangeViewDates({
    values: mergedValue,
    picker,
    defaultDates: defaultPickerValue,
    generateConfig,
  });

  // ========================= Select Values =========================
  const [selectedValue, setSelectedValue] = useMergedState(mergedValue, {
    postState: (values) => {
      let postValues = values;

      if (mergedDisabled[0] && mergedDisabled[1]) {
        return postValues;
      }

      // Fill disabled unit
      for (let i = 0; i < 2; i += 1) {
        if (mergedDisabled[i] && !getValue(postValues, i) && !getValue(allowEmpty, i)) {
          postValues = updateValues(postValues, generateConfig.getNow(), i);
        }
      }
      return postValues;
    },
  });

  // ============================= Modes =============================
  const [mergedModes, setInnerModes] = useMergedState<[PanelMode, PanelMode]>([picker, picker], {
    value: mode,
  });

  useEffect(() => {
    setInnerModes([picker, picker]);
  }, [picker]);

  const triggerModesChange = (modes: [PanelMode, PanelMode], values: RangeValue<DateType>) => {
    setInnerModes(modes);

    if (onPanelChange) {
      onPanelChange(values, modes);
    }
  };

  // ========================= Disable Date ==========================
  const [disabledStartDate, disabledEndDate] = useRangeDisabled(
    {
      picker,
      selectedValue,
      locale,
      disabled: mergedDisabled,
      disabledDate,
      generateConfig,
    },
    false,
    false,
  );

  // ============================ Trigger ============================
  const triggerRef = React.useRef<any>();

  function triggerOpen(newOpen: boolean, index: 0 | 1) {
    if (newOpen) {
      clearTimeout(triggerRef.current);
      openRecordsRef.current[index] = true;

      setMergedActivePickerIndex(index);
      // triggerInnerOpen(newOpen);

      // Open to reset view date
      if (!mergedOpen) {
        setViewDate(null, index);
      }
    } else if (mergedActivePickerIndex === index) {
      // triggerInnerOpen(newOpen);

      // Clean up async
      // This makes ref not quick refresh in case user open another input with blur trigger
      const openRecords = openRecordsRef.current;
      triggerRef.current = setTimeout(() => {
        if (openRecords === openRecordsRef.current) {
          openRecordsRef.current = {};
        }
      });
    }
  }

  /** 打开面板 & 触发 Input focus */
  function triggerOpenAndFocus(index: 0 | 1) {
    triggerOpen(true, index);
    // Use setTimeout to make sure panel DOM exists
    // setTimeout(() => {
    //   const inputRef = [startInputRef, endInputRef][index];
    //   if (inputRef.current) {
    //     inputRef.current.focus();
    //   }
    // }, 0);
  }

  function triggerChange(newValue: RangeValue<DateType>, sourceIndex: 0 | 1 | null) {
    let values = newValue;
    let startValue = getValue(values, 0);
    let endValue = getValue(values, 1);

    // >>>>> Format start & end values
    if (startValue && endValue && generateConfig.isAfter(startValue, endValue)) {
      if (
        // WeekPicker only compare week
        (picker === 'week' && !isSameWeek(generateConfig, locale.locale, startValue, endValue)) ||
        // QuotaPicker only compare week
        (picker === 'quarter' && !isSameQuarter(generateConfig, startValue, endValue)) ||
        // Other non-TimePicker compare date
        (picker !== 'week' &&
          picker !== 'quarter' &&
          picker !== 'time' &&
          !isSameDate(generateConfig, startValue, endValue))
      ) {
        // Clean up end date when start date is after end date
        if (sourceIndex === 0) {
          values = [startValue, null];
          endValue = null;
        } else {
          startValue = null;
          values = [null, endValue];
        }

        // Clean up cache since invalidate
        // openRecordsRef.current = {
        //   [sourceIndex]: true,
        // };
      } else if (picker !== 'time' || order !== false) {
        // Reorder when in same date
        values = reorderValues(values, generateConfig);
      }
    }

    setSelectedValue(values);

    const startStr =
      values && values[0]
        ? formatValue(values[0], { generateConfig, locale, format: formatList[0] })
        : '';

    const endStr =
      values && values[1]
        ? formatValue(values[1], { generateConfig, locale, format: formatList[0] })
        : '';

    if (onCalendarChange) {
      const info: RangeInfo = { range: sourceIndex === 0 ? 'start' : 'end' };

      onCalendarChange(values, [startStr, endStr], info);
    }

    // >>>>> Trigger `onChange` event
    const canStartValueTrigger = canValueTrigger(startValue, 0, mergedDisabled, allowEmpty);
    const canEndValueTrigger = canValueTrigger(endValue, 1, mergedDisabled, allowEmpty);

    const canTrigger = values === null || (canStartValueTrigger && canEndValueTrigger);

    if (canTrigger) {
      // Trigger onChange only when value is validate
      setInnerValue(values);

      if (
        onChange &&
        (!isEqual(generateConfig, getValue(mergedValue, 0), startValue) ||
          !isEqual(generateConfig, getValue(mergedValue, 1), endValue))
      ) {
        onChange(values, [startStr, endStr]);
      }
    }

    // Always open another picker if possible
    let nextOpenIndex: 0 | 1 | null = null;
    if (sourceIndex === 0 && !mergedDisabled[1]) {
      nextOpenIndex = 1;
    } else if (sourceIndex === 1 && !mergedDisabled[0]) {
      nextOpenIndex = 0;
    }

    if (
      nextOpenIndex !== null &&
      nextOpenIndex !== mergedActivePickerIndex &&
      (!openRecordsRef.current[nextOpenIndex] || !getValue(values, nextOpenIndex)) &&
      getValue(values, sourceIndex)
    ) {
      // Delay to focus to avoid input blur trigger expired selectedValues
      triggerOpenAndFocus(nextOpenIndex);
    } else {
      triggerOpen(false, sourceIndex);
    }
  }

  // ============================= Text ==============================

  const [rangeHoverValue, setRangeHoverValue] = useState<RangeValue<DateType>>(null);

  // ========================== Hover Range ==========================
  const [hoverRangedValue, setHoverRangedValue] = useState<RangeValue<DateType>>(null);

  const onDateMouseEnter = (date: DateType) => {
    setHoverRangedValue(updateValues(selectedValue, date, mergedActivePickerIndex));
  };

  const onDateMouseLeave = () => {
    setHoverRangedValue(updateValues(selectedValue, null, mergedActivePickerIndex));
  };

  const mergedOpen = true;

  // ============================= Sync ==============================
  // Close should sync back with text value
  const startStr =
    mergedValue && mergedValue[0]
      ? formatValue(mergedValue[0], {
          locale,
          format: 'YYYYMMDDHHmmss',
          generateConfig,
        })
      : '';

  const endStr =
    mergedValue && mergedValue[1]
      ? formatValue(mergedValue[1], {
          locale,
          format: 'YYYYMMDDHHmmss',
          generateConfig,
        })
      : '';

  // useEffect(() => {
  //   if (!mergedOpen) {
  //     setSelectedValue(mergedValue);

  //     if (!startValueTexts.length || startValueTexts[0] === '') {
  //       triggerStartTextChange('');
  //     } else if (firstStartValueText !== startText) {
  //       resetStartText();
  //     }
  //     if (!endValueTexts.length || endValueTexts[0] === '') {
  //       triggerEndTextChange('');
  //     } else if (firstEndValueText !== endText) {
  //       resetEndText();
  //     }
  //   }
  // }, [mergedOpen, startValueTexts, endValueTexts]);

  // Sync innerValue with control mode
  useEffect(() => {
    setSelectedValue(mergedValue);
  }, [startStr, endStr]);

  // ============================ Warning ============================
  // if (process.env.NODE_ENV !== 'production') {
  //   if (
  //     value &&
  //     Array.isArray(disabled) &&
  //     ((getValue(disabled, 0) && !getValue(value, 0)) ||
  //       (getValue(disabled, 1) && !getValue(value, 1)))
  //   ) {
  //     warning(
  //       false,
  //       '`disabled` should not set with empty `value`. You should set `allowEmpty` or `value` instead.',
  //     );
  //   }
  // }

  // ============================ Ranges =============================
  const rangeLabels = Object.keys(ranges || {});

  const rangeList = rangeLabels.map((label) => {
    const range = ranges![label];
    const newValues = typeof range === 'function' ? range() : range;

    return {
      label,
      onClick: () => {
        triggerChange(newValues, null);
        triggerOpen(false, mergedActivePickerIndex);
      },
      onMouseEnter: () => {
        setRangeHoverValue(newValues);
      },
      onMouseLeave: () => {
        setRangeHoverValue(null);
      },
    };
  });

  console.log(rangeLabels, 'rangeLabels>>>>>>>>>>>');

  // ============================= Panel =============================
  function renderPanel(
    panelPosition: 'left' | 'right' | false = false,
    panelProps: Partial<PickerPanelProps<DateType>> = {},
  ) {
    let panelHoverRangedValue: RangeValue<DateType> = null;
    if (
      mergedOpen &&
      hoverRangedValue &&
      hoverRangedValue[0] &&
      hoverRangedValue[1] &&
      generateConfig.isAfter(hoverRangedValue[1], hoverRangedValue[0])
    ) {
      panelHoverRangedValue = hoverRangedValue;
    }

    let panelShowTime: boolean | SharedTimeProps<DateType> | undefined =
      showTime as SharedTimeProps<DateType>;

    if (showTime && typeof showTime === 'object' && showTime.defaultValue) {
      const timeDefaultValues: DateType[] = showTime.defaultValue!;
      panelShowTime = {
        ...showTime,
        defaultValue: getValue(timeDefaultValues, mergedActivePickerIndex) || undefined,
      };
    }

    let panelDateRender: DateRender<DateType> | null = null;
    if (dateRender) {
      panelDateRender = (date, today) =>
        dateRender(date, today, {
          range: mergedActivePickerIndex ? 'end' : 'start',
        });
    }

    // const render = panelPosition === 'left' ? panelRender[0] : panelRender[1];

    return (
      <RangeContext.Provider
        value={{
          inRange: true,
          panelPosition,
          rangedValue: rangeHoverValue || selectedValue,
          hoverRangedValue: panelHoverRangedValue,
        }}
      >
        <PickerPanel<DateType>
          {...(props as any)}
          {...panelProps}
          dateRender={panelDateRender}
          showTime={panelShowTime}
          // mode={mergedModes[mergedActivePickerIndex]}
          generateConfig={generateConfig}
          style={undefined}
          direction={direction}
          disabledDate={mergedActivePickerIndex === 0 ? disabledStartDate : disabledEndDate}
          disabledTime={(date) => {
            if (disabledTime) {
              return disabledTime(date, mergedActivePickerIndex === 0 ? 'start' : 'end');
            }
            return false;
          }}
          // className={classNames({
          //   [`${prefixCls}-panel-focused`]:
          //     mergedActivePickerIndex === 0 ? !startTyping : !endTyping,
          // })}
          value={getValue(selectedValue, mergedActivePickerIndex)}
          locale={locale}
          tabIndex={-1}
          onPanelChange={(date, newMode) => {
            // clear hover value when panel change
            if (mergedActivePickerIndex === 0) {
              // onStartLeave(true);
            }
            if (mergedActivePickerIndex === 1) {
              // onEndLeave(true);
            }
            triggerModesChange(
              updateValues(mergedModes, newMode, mergedActivePickerIndex),
              updateValues(selectedValue, date, mergedActivePickerIndex),
            );

            let viewDate = date;
            if (panelPosition === 'right' && mergedModes[mergedActivePickerIndex] === newMode) {
              viewDate = getClosingViewDate(viewDate, newMode as any, generateConfig, -1);
            }
            setViewDate(viewDate, mergedActivePickerIndex);
          }}
          onOk={null}
          onSelect={undefined}
          onChange={undefined}
          defaultValue={
            mergedActivePickerIndex === 0 ? getValue(selectedValue, 1) : getValue(selectedValue, 0)
          }
        />
      </RangeContext.Provider>
    );
  }

  let arrowLeft: number = 0;
  let panelLeft: number = 0;
  if (mergedActivePickerIndex && startInputDivRef.current && panelDivRef.current) {
    // Arrow offset
    // arrowLeft = startInputDivRef.current.offsetWidth + separatorRef.current.offsetWidth;

    // If panelWidth - arrowWidth - arrowMarginLeft < arrowLeft, panel should move to right side.
    // If offsetLeft > arrowLeft, arrow position is absolutely right, because arrowLeft is not calculated with arrow margin.
    if (
      panelDivRef.current.offsetWidth &&
      arrowRef.current.offsetWidth &&
      arrowLeft >
        panelDivRef.current.offsetWidth -
          arrowRef.current.offsetWidth -
          (direction === 'rtl' || arrowRef.current.offsetLeft > arrowLeft
            ? 0
            : arrowRef.current.offsetLeft)
    ) {
      panelLeft = arrowLeft;
    }
  }

  const arrowPositionStyle = direction === 'rtl' ? { right: arrowLeft } : { left: arrowLeft };

  function renderPanels() {
    // let panels: React.ReactNode;
    const extraNode = getExtraFooter(
      prefixCls,
      mergedModes[mergedActivePickerIndex],
      renderExtraFooter,
    );

    // const rangesNode = getRanges({
    //   prefixCls,
    //   components,
    //   needConfirmButton,
    //   okDisabled:
    //     !getValue(selectedValue, mergedActivePickerIndex) ||
    //     (disabledDate && disabledDate(selectedValue[mergedActivePickerIndex])),
    //   locale,
    //   rangeList,
    //   // onOk: () => {
    //   //   if (getValue(selectedValue, mergedActivePickerIndex)) {
    //   //     // triggerChangeOld(selectedValue);
    //   //     triggerChange(selectedValue, mergedActivePickerIndex);
    //   //     if (onOk) {
    //   //       onOk(selectedValue);
    //   //     }
    //   //   }
    //   // },
    // });

    const viewDate = getViewDate(mergedActivePickerIndex);
    const nextViewDate = getClosingViewDate(viewDate, picker, generateConfig);

    const leftPanel = renderPanel('left', {
      pickerValue: viewDate,
      onPickerValueChange: (newViewDate) => {
        setViewDate(newViewDate, mergedActivePickerIndex);
      },
    });
    const rightPanel = renderPanel('right', {
      pickerValue: nextViewDate,
      onPickerValueChange: (newViewDate) => {
        setViewDate(
          getClosingViewDate(newViewDate, picker, generateConfig, -1),
          mergedActivePickerIndex,
        );
      },
    });

    const panels = [leftPanel, rightPanel];

    if (direction === 'rtl') {
      panels.reverse();
    }

    const mergedNodes: React.ReactNode = (
      <Fragment>
        <div className={`${prefixCls}-panels`}>{panels}</div>
        {/* {(extraNode || rangesNode) && (
          <div className={`${prefixCls}-footer`}>
            {extraNode}
            {rangesNode}
          </div>
        )} */}
      </Fragment>
    );

    return (
      <ResultContext.Provider
        value={{
          selectedValue,
        }}
      >
        <div
          className={`${prefixCls}-panel-container`}
          style={{ marginLeft: panelLeft }}
          ref={panelDivRef}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
        >
          {mergedNodes}
        </div>
      </ResultContext.Provider>
    );
  }

  const rangePanel = (
    <div
      className={classNames(`${prefixCls}-range-wrapper`, `${prefixCls}-${picker}-range-wrapper`)}
      style={{ display: 'inline-flex', flexDirection: 'column' }}
    >
      {/* <div ref={arrowRef} className={`${prefixCls}-range-arrow`} style={arrowPositionStyle} /> */}
      {renderPanels()}
    </div>
  );

  // ============================ Return =============================
  const onContextSelect = (date: DateType, type: 'key' | 'mouse' | 'submit') => {
    const values = updateValues(selectedValue, date, mergedActivePickerIndex);

    if (type === 'submit' || (type !== 'key' && !needConfirmButton)) {
      // triggerChange will also update selected values
      triggerChange(values, mergedActivePickerIndex);
      // clear hover value style
    } else {
      setSelectedValue(values);
    }
  };

  return (
    <PanelContext.Provider
      value={{
        onDateMouseEnter,
        onDateMouseLeave,
        hideRanges: true,
        onSelect: onContextSelect,
      }}
    >
      <div className={`${prefixCls}-wrapper`}>
        {!!rangeLabels.length && (
          <ShortCutPanel
            rangeList={rangeList}
            needConfirmButton={false}
            setRangeHoverValue={setRangeHoverValue}
          />
        )}
        <div>
          <RangeResult
            format={format}
            picker="date"
            locale={locale}
            selectedValue={selectedValue}
            generateConfig={generateConfig}
          />
          {rangePanel}
          <div className={`${prefixCls}-footer`}>footer</div>
        </div>
      </div>
    </PanelContext.Provider>
  );
}

export default RangePickerPanel;
