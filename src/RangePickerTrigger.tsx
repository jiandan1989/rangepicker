import classNames from 'classnames';
import React, { useEffect, useRef, useState } from 'react';
import PanelContext, { ContextOperationRefProps } from './PanelContext';
import PickerTrigger from './PickerTrigger';
import { getValue, toArray } from './utils/miscUtil';
import { elementsContains, getDefaultFormat, getInputSize } from './utils/uiUtil';

interface RangePickerTriggerProps<DateType> {
  suffixIcon: any;
  allowClear?: boolean;
  direction?: 'ltr' | 'rtl';
  placeholder?: [string, string];
  separator?: React.ReactNode;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  onMouseDown?: React.MouseEventHandler<HTMLDivElement>;
  onMouseUp?: React.MouseEventHandler<HTMLDivElement>;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
  autoComplete?: string;
  [k: string]: any;
}

const RangePickerTrigger = <DateType,>(props: RangePickerTriggerProps<DateType>) => {
  const {
    id,
    style,
    onBlur,
    onFocus,
    onClick,
    className,
    popupStyle,
    onMouseUp,
    onKeyDown,
    autoComplete = 'off',
    onMouseEnter,
    onMouseLeave,
    suffixIcon,
    dropdownAlign,
    transitionName,
    getPopupContainer,
    dropdownClassName,
    picker,
    direction,
    allowClear,
    placeholder,
    autoFocus,
    inputReadOnly,
    separator = '~',
    prefixCls,
    generateConfig,
    showTime,
    use12Hours,
    format,
  } = props;
  /** refs */
  const startInputDivRef = useRef<HTMLDivElement>(null);
  const endInputDivRef = useRef<HTMLDivElement>(null);
  const startInputRef = useRef<HTMLInputElement>(null);

  // Operation ref
  const operationRef: React.MutableRefObject<ContextOperationRefProps | null> =
    useRef<ContextOperationRefProps>(null);

  // ============================= Misc ==============================
  const formatList = toArray(getDefaultFormat<DateType>(format, picker, showTime, use12Hours));

  /** input 通用样式 */
  const inputSharedProps = {
    size: getInputSize(picker, formatList[0], generateConfig),
  };

  // ============================= Input =============================
  const getSharedInputHookProps = (index: 0 | 1, resetText: () => void) => ({
    blurToCancel: needConfirmButton,
    forwardKeyDown,
    onBlur,
    isClickOutside: (target: EventTarget | null) =>
      !elementsContains(
        [
          panelDivRef.current,
          startInputDivRef.current,
          endInputDivRef.current,
          containerRef.current,
        ],
        target as HTMLElement,
      ),
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      setMergedActivePickerIndex(index);
      if (onFocus) {
        onFocus(e);
      }
    },
    triggerOpen: (newOpen: boolean) => {
      triggerOpen(newOpen, index);
    },
    onSubmit: () => {
      if (
        // When user typing disabledDate with keyboard and enter, this value will be empty
        !selectedValue ||
        // Normal disabled check
        (disabledDate && disabledDate(selectedValue[index]))
      ) {
        return false;
      }

      triggerChange(selectedValue, index);
      resetText();
    },
    onCancel: () => {
      triggerOpen(false, index);
      setSelectedValue(mergedValue);
      resetText();
    },
  });

  // ============================= Open ==============================
  const [mergedOpen, triggerInnerOpen] = useMergedState(true, {
    value: open,
    defaultValue: defaultOpen,
    postState: (postOpen) => (mergedDisabled[mergedActivePickerIndex] ? false : postOpen),
    onChange: (newOpen) => {
      if (onOpenChange) {
        onOpenChange(newOpen);
      }

      if (!newOpen && operationRef.current && operationRef.current.onClose) {
        operationRef.current.onClose();
      }
    },
  });

  const startOpen = mergedOpen && mergedActivePickerIndex === 0;
  const endOpen = mergedOpen && mergedActivePickerIndex === 1;

  // ============================= Popup =============================
  // Popup min width
  const [popupMinWidth, setPopupMinWidth] = useState(0);
  useEffect(() => {
    if (!mergedOpen && containerRef.current) {
      setPopupMinWidth(containerRef.current.offsetWidth);
    }
  }, [mergedOpen]);

  const [startInputProps, { focused: startFocused, typing: startTyping }] = usePickerInput({
    ...getSharedInputHookProps(0, resetStartText),
    open: startOpen,
    value: startText,
    onKeyDown: (e, preventDefault) => {
      onKeyDown?.(e, preventDefault);
    },
  });

  const [endInputProps, { focused: endFocused, typing: endTyping }] = usePickerInput({
    ...getSharedInputHookProps(1, resetEndText),
    open: endOpen,
    value: endText,
    onKeyDown: (e, preventDefault) => {
      onKeyDown?.(e, preventDefault);
    },
  });

  // ============================= Icons =============================
  let suffixNode: React.ReactNode;
  if (suffixIcon) {
    suffixNode = <span className={`${prefixCls}-suffix`}>{suffixIcon}</span>;
  }

  let clearNode: React.ReactNode;
  if (
    allowClear &&
    ((getValue(mergedValue, 0) && !mergedDisabled[0]) ||
      (getValue(mergedValue, 1) && !mergedDisabled[1]))
  ) {
    clearNode = (
      <span
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onMouseUp={(e) => {
          e.preventDefault();
          e.stopPropagation();
          let values = mergedValue;

          if (!mergedDisabled[0]) {
            values = updateValues(values, null, 0);
          }
          if (!mergedDisabled[1]) {
            values = updateValues(values, null, 1);
          }

          triggerChange(values, null);
          triggerOpen(false, mergedActivePickerIndex);
        }}
        className={`${prefixCls}-clear`}
      >
        {clearIcon || <span className={`${prefixCls}-clear-btn`} />}
      </span>
    );
  }

  let arrowLeft: number = 0;
  /** 动态下划线 */
  let activeBarLeft: number = 0;
  let activeBarWidth: number = 0;
  if (startInputDivRef.current && endInputDivRef.current && separatorRef.current) {
    if (mergedActivePickerIndex === 0) {
      activeBarWidth = startInputDivRef.current.offsetWidth;
    } else {
      activeBarLeft = arrowLeft;
      activeBarWidth = endInputDivRef.current.offsetWidth;
    }
  }
  const activeBarPositionStyle =
    direction === 'rtl' ? { right: activeBarLeft } : { left: activeBarLeft };

  // // ========================== Click Picker ==========================
  const onPickerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // When click inside the picker & outside the picker's input elements
    // the panel should still be opened
    if (onClick) {
      onClick(e);
    }
    if (
      !mergedOpen &&
      !startInputRef.current.contains(e.target as Node) &&
      !endInputRef.current.contains(e.target as Node)
    ) {
      if (!mergedDisabled[0]) {
        triggerOpenAndFocus(0);
      } else if (!mergedDisabled[1]) {
        triggerOpenAndFocus(1);
      }
    }
  };

  const onPickerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // shouldn't affect input elements if picker is active
    if (onMouseDown) {
      onMouseDown(e);
    }
    if (
      mergedOpen &&
      (startFocused || endFocused) &&
      !startInputRef.current.contains(e.target as Node) &&
      !endInputRef.current.contains(e.target as Node)
    ) {
      e.preventDefault();
    }
  };

  return (
    <PanelContext.Provider
      value={{
        operationRef,
        hideHeader: picker === 'time',
        onDateMouseEnter,
        onDateMouseLeave,
        hideRanges: true,
        onSelect: onContextSelect,
        open: mergedOpen,
      }}
    >
      <PickerTrigger
        visible={mergedOpen}
        popupElement={rangePanel}
        popupStyle={popupStyle}
        prefixCls={prefixCls}
        dropdownClassName={dropdownClassName}
        dropdownAlign={dropdownAlign}
        getPopupContainer={getPopupContainer}
        transitionName={transitionName}
        range
        direction={direction}
      >
        <div
          ref={containerRef}
          className={classNames(prefixCls, `${prefixCls}-range`, className, {
            [`${prefixCls}-disabled`]: mergedDisabled[0] && mergedDisabled[1],
            [`${prefixCls}-focused`]: mergedActivePickerIndex === 0 ? startFocused : endFocused,
            [`${prefixCls}-rtl`]: direction === 'rtl',
          })}
          style={style}
          onClick={onPickerClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onMouseDown={onPickerMouseDown}
          onMouseUp={onMouseUp}
          {...getDataOrAriaProps(props)}
        >
          <div
            className={classNames(`${prefixCls}-input`, {
              [`${prefixCls}-input-active`]: mergedActivePickerIndex === 0,
              [`${prefixCls}-input-placeholder`]: !!startHoverValue,
            })}
            ref={startInputDivRef}
          >
            <input
              id={id}
              disabled={mergedDisabled[0]}
              readOnly={inputReadOnly || typeof formatList[0] === 'function' || !startTyping}
              value={startHoverValue || startText}
              onChange={(e) => {
                triggerStartTextChange(e.target.value);
              }}
              autoFocus={autoFocus}
              placeholder={getValue(placeholder, 0) || ''}
              ref={startInputRef}
              {...startInputProps}
              {...inputSharedProps}
              autoComplete={autoComplete}
            />
          </div>
          <div className={`${prefixCls}-range-separator`} ref={separatorRef}>
            {separator}
          </div>
          <div
            className={classNames(`${prefixCls}-input`, {
              [`${prefixCls}-input-active`]: mergedActivePickerIndex === 1,
              [`${prefixCls}-input-placeholder`]: !!endHoverValue,
            })}
            ref={endInputDivRef}
          >
            <input
              disabled={mergedDisabled[1]}
              readOnly={inputReadOnly || typeof formatList[0] === 'function' || !endTyping}
              value={endHoverValue || endText}
              onChange={(e) => {
                triggerEndTextChange(e.target.value);
              }}
              placeholder={getValue(placeholder, 1) || ''}
              ref={endInputRef}
              {...endInputProps}
              {...inputSharedProps}
              autoComplete={autoComplete}
            />
          </div>
          {/* 动态下划线 */}
          <div
            className={`${prefixCls}-active-bar`}
            style={{
              ...activeBarPositionStyle,
              width: activeBarWidth,
              position: 'absolute',
            }}
          />
          {suffixNode}
          {clearNode}
        </div>
      </PickerTrigger>
    </PanelContext.Provider>
  );
};

export default RangePickerTrigger;
