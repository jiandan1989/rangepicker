import classNames from 'classnames';
import type {
  DisabledTimes,
  EventValue,
  PanelMode,
  PickerMode,
  RangeValue,
} from 'rc-picker/lib/interface';
import PanelContext from 'rc-picker/lib/PanelContext';
import type { PickerBaseProps } from 'rc-picker/lib/Picker';
import PickerPanel, { PickerPanelProps } from 'rc-picker/lib/PickerPanel';
import RangeContext from 'rc-picker/lib/RangeContext';
import { RangeDateRender, RangeInfo } from 'rc-picker/lib/RangePicker';
import getExtraFooter from 'rc-picker/lib/utils/getExtraFooter';
import getRanges from 'rc-picker/lib/utils/getRanges';
import * as React from 'react';
import './index.less';

/**
 * 1. 动态渲染左侧 / 右侧面板
 * 2. mode 允许接收不同的 picker 配置, 但同样不允许点击 仅渲染当前一个
 * 3. picker = time 或者 showTime = true 仅显示独立一个面板 所以 picker 不允许为 time
 */

export type RangeType = 'start' | 'end';
export type RangePickerDirectionType = 'ltr' | 'rtl';

export type RangePickerPanelSharedProps<DateType> = {
  id?: string;
  value?: RangeValue<DateType>;
  defaultValue?: RangeValue<DateType>;
  defaultPickerValue?: [DateType, DateType];
  placeholder?: [string, string];
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
  /** 触发面板 mode */
  onPanelChange?: (values: RangeValue<DateType>, modes: [PanelMode, PanelMode]) => void;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onOk?: (dates: RangeValue<DateType>) => void;
  direction?: 'ltr' | 'rtl';
  autoComplete?: string;
  /** @private Internal control of active picker. Do not use since it's private usage */
  activePickerIndex?: 0 | 1;
  dateRender?: RangeDateRender<DateType>;
  /** 自定义渲染整个面板 */
  panelRender?: (originPanel: React.ReactNode) => React.ReactNode;
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
  | 'picker'
>;

export type RangePickerPanelBaseProps<DateType> = {} & RangePickerPanelSharedProps<DateType> &
  OmitPickerProps<PickerBaseProps<DateType>> & { showTime?: boolean; picker?: PickerMode };

export type RangePickerPanelProps<DateType> = RangePickerPanelSharedProps<DateType>;

const RangePickerPanel = <DateType,>(props: RangePickerPanelBaseProps<DateType>) => {
  const {
    ranges,
    locale,
    components,
    prefixCls = 'ant-picker',
    picker = 'year',
    direction = 'ltr',
    renderExtraFooter,
    generateConfig,
    mode,
  } = props;
  const [rangeHoverValue, setRangeHoverValue] = React.useState<RangeValue<DateType>>(null);

  /** hover */
  const onDateMouseEnter = (date: DateType) => {
    console.log('hoverRangedValue>>>>>>>>>>', date);
  };

  /** leave */
  const onDateMouseLeave = () => {
    console.log('onDateMouseLeave>>>>>>>>>>');
  };

  // ============================ Return =============================
  const onContextSelect = (date: DateType, type: 'key' | 'mouse' | 'submit') => {
    console.log('onContextSelect>>>>>>>>>>>>', date, type);
  };

  // ============================ Ranges =============================
  const rangeLabels = Object.keys(ranges || {});
  const rangeList = rangeLabels.map((label) => {
    const range = ranges![label];
    const newValues = typeof range === 'function' ? range() : range;

    return {
      label,
      onClick: () => {
        console.log('onClick>>>>>>>>>>>>>');
        // triggerChange(newValues, null);
        // triggerOpen(false, mergedActivePickerIndex);
      },
      onMouseEnter: () => {
        console.log('hover 面板时 设置范围');
        // setRangeHoverValue(newValues);
      },
      onMouseLeave: () => {
        console.log('onMouseLeave>>>>>>>>>>>>>');
        setRangeHoverValue(null);
      },
    };
  });

  // ============================= Panel =============================
  function renderPanel(
    panelPosition: 'left' | 'right' | false = false,
    panelProps: Partial<PickerPanelProps<DateType>> = {},
  ) {
    let panelHoverRangedValue: RangeValue<DateType> = null;
    // if (
    //   mergedOpen &&
    //   hoverRangedValue &&
    //   hoverRangedValue[0] &&
    //   hoverRangedValue[1] &&
    //   generateConfig.isAfter(hoverRangedValue[1], hoverRangedValue[0])
    // ) {
    //   panelHoverRangedValue = hoverRangedValue;
    // }

    // /** 是否显示时间筛选 */
    // let panelShowTime: boolean | SharedTimeProps<DateType> | undefined =
    //   showTime as SharedTimeProps<DateType>;
    // if (showTime && typeof showTime === 'object' && showTime.defaultValue) {
    //   const timeDefaultValues: DateType[] = showTime.defaultValue!;
    //   panelShowTime = {
    //     ...showTime,
    //     defaultValue: getValue(timeDefaultValues, mergedActivePickerIndex) || undefined,
    //   };
    // }

    // let panelDateRender: DateRender<DateType> | null = null;
    // if (dateRender) {
    //   panelDateRender = (date, today) =>
    //     dateRender(date, today, {
    //       range: mergedActivePickerIndex ? 'end' : 'start',
    //     });
    // }

    return (
      <RangeContext.Provider
        value={{
          inRange: true,
          panelPosition,
          // rangedValue: rangeHoverValue || selectedValue,
          hoverRangedValue: panelHoverRangedValue,
        }}
      >
        <PickerPanel<DateType>
          {...(props as any)}
          {...panelProps}
          locale={locale}
          tabIndex={-1}
          prefixCls={prefixCls}
          onOk={null}
          onSelect={undefined}
          onChange={undefined}
          // dateRender={panelDateRender}
          // showTime={panelShowTime}
          mode={mode}
          generateConfig={generateConfig}
          style={undefined}
          // direction={direction}
          // disabledDate={mergedActivePickerIndex === 0 ? disabledStartDate : disabledEndDate}
          // disabledTime={(date) => {
          //   if (disabledTime) {
          //     return disabledTime(date, mergedActivePickerIndex === 0 ? 'start' : 'end');
          //   }
          //   return false;
          // }}
          // className={classNames({
          //   [`${prefixCls}-panel-focused`]:
          //     mergedActivePickerIndex === 0 ? !startTyping : !endTyping,
          // })}
          // value={getValue(selectedValue, mergedActivePickerIndex)}
          // onPanelChange={(date, newMode) => {
          //   // clear hover value when panel change
          //   if (mergedActivePickerIndex === 0) {
          //     onStartLeave(true);
          //   }
          //   if (mergedActivePickerIndex === 1) {
          //     onEndLeave(true);
          //   }
          //   triggerModesChange(
          //     updateValues(mergedModes, newMode, mergedActivePickerIndex),
          //     updateValues(selectedValue, date, mergedActivePickerIndex),
          //   );

          //   let viewDate = date;
          //   if (panelPosition === 'right' && mergedModes[mergedActivePickerIndex] === newMode) {
          //     viewDate = getClosingViewDate(viewDate, newMode as any, generateConfig, -1);
          //   }
          //   setViewDate(viewDate, mergedActivePickerIndex);
          // }}
          // defaultValue={
          //   mergedActivePickerIndex === 0 ? getValue(selectedValue, 1) : getValue(selectedValue, 0)
          // }
          // defaultPickerValue={undefined}
        />
      </RangeContext.Provider>
    );
  }
  /**
   * 包含:
   * 1. 面板
   * 2. footer
   * 3. panelRender / ranges renderExtraFooter
   */
  function renderPanels() {
    let panels: React.ReactNode;

    const leftPanel = renderPanel('left');
    const rightPanel = renderPanel('right');

    if (direction === 'rtl') {
      panels = (
        <>
          {rightPanel}
          {leftPanel}
        </>
      );
    } else {
      panels = (
        <>
          {leftPanel}
          {rightPanel}
        </>
      );
    }

    /** 渲染 panel footer */
    const extraNode = getExtraFooter(prefixCls, picker, renderExtraFooter);

    /** 快捷筛选 */
    const rangesNode = getRanges({
      prefixCls,
      components,
      needConfirmButton: false,
      okDisabled: false,
      locale,
      rangeList,
      onOk: () => {
        console.log('>>>>>>>>>>>onOk');
      },
    });

    let mergedNodes: React.ReactNode = (
      <React.Fragment>
        <div className={`${prefixCls}-panels`}>{panels}</div>
        {(extraNode || rangesNode) && (
          <div className={`${prefixCls}-footer`}>
            {extraNode}
            {rangesNode}
          </div>
        )}
      </React.Fragment>
    );

    return (
      <div
        className={`${prefixCls}-panel-container`}
        // style={{ marginLeft: panelLeft }}
        // ref={panelDivRef}
        onMouseDown={(e) => {
          e.preventDefault();
        }}
      >
        {mergedNodes}
      </div>
    );
  }

  return (
    <PanelContext.Provider
      value={{
        // operationRef,
        hideHeader: picker === 'time',
        onDateMouseEnter,
        onDateMouseLeave,
        hideRanges: true,
        onSelect: onContextSelect,
        // open: mergedOpen,
      }}
    >
      <div
        className={classNames(`${prefixCls}-range-wrapper`, `${prefixCls}-${picker}-range-wrapper`)}
        // style={{ minWidth: popupMinWidth }}
      >
        {renderPanels()}
      </div>
    </PanelContext.Provider>
  );
};

export default RangePickerPanel;
