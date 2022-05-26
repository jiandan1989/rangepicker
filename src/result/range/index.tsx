import Picker from 'rc-picker';
import generateConfig from 'rc-picker/lib/generate/moment';
import zh_CN from 'rc-picker/lib/locale/zh_CN';
import React, { Fragment, useState } from 'react';
import { useTextValueMapping } from '../../hooks';
import useHoverValue from '../../hooks/useHoverValue';
import useValueTexts from '../../hooks/useValueTexts';
import { parseValue } from '../../utils/dateUtil';
import { getValue, toArray } from '../../utils/miscUtil';
import { getDefaultFormat } from '../../utils/uiUtil';

interface RangeResultProps<DateType> {
  prefixCls?: string;
  format?: any;
  picker?: any;
  separator?: string;
  showTime?: boolean;
  use12Hours?: boolean;
  locale?: any;
  selectedValue?: any;
  generateConfig?: any;
}

interface TimeTextProps {
  prefixCls?: string;
  time?: string;
  type?: 'start' | 'end';
}

const TimeText = (props: TimeTextProps) => {
  const { prefixCls = 'ant-picker', time, type } = props;
  const [open, setOpen] = useState(false);

  return (
    <span className={`${prefixCls}-time ${prefixCls}-start-time`}>
      {!open ? (
        <span
          onClick={() => {
            setOpen(true);
          }}
        >
          {time}
        </span>
      ) : (
        <Picker
          picker="time"
          locale={zh_CN}
          prefixCls={prefixCls}
          generateConfig={generateConfig}
        />
      )}
    </span>
  );
};

function RangeResult<DateType>(props: RangeResultProps<DateType>) {
  const {
    prefixCls = 'ant-picker',
    locale,
    format,
    generateConfig,
    picker = 'date',
    showTime = true,
    use12Hours = false,
    selectedValue,
    separator = '~',
  } = props;
  // const { selectedValue } = React.useContext(ResultContext);
  const formatList = toArray(getDefaultFormat<DateType>(format, picker, showTime, use12Hours));
  const sharedTextHooksProps = {
    formatList,
    generateConfig,
    locale,
  };

  const [startValueTexts, firstStartValueText] = useValueTexts<DateType>(
    getValue(selectedValue, 0),
    sharedTextHooksProps,
  );

  const [endValueTexts, firstEndValueText] = useValueTexts<DateType>(
    getValue(selectedValue, 1),
    sharedTextHooksProps,
  );

  const onTextChange = (newText: string, index: 0 | 1) => {
    const inputDate = parseValue(newText, {
      locale,
      formatList,
      generateConfig,
    });

    // const disabledFunc = index === 0 ? disabledStartDate : disabledEndDate;

    // if (inputDate && !disabledFunc(inputDate)) {
    //   setSelectedValue(updateValues(selectedValue, inputDate, index));
    //   setViewDate(inputDate, index);
    // }
  };

  const [startText, triggerStartTextChange, resetStartText] = useTextValueMapping({
    valueTexts: startValueTexts,
    onTextChange: (newText) => onTextChange(newText, 0),
  });

  const [endText, triggerEndTextChange, resetEndText] = useTextValueMapping({
    valueTexts: endValueTexts,
    onTextChange: (newText) => onTextChange(newText, 1),
  });

  const [startHoverValue, onStartEnter, onStartLeave] = useHoverValue(startText, {
    formatList,
    generateConfig,
    locale,
  });

  const [endHoverValue, onEndEnter, onEndLeave] = useHoverValue(endText, {
    formatList,
    generateConfig,
    locale,
  });

  return (
    <div className={`${prefixCls}-range-result`}>
      {startText && endText && (
        <Fragment>
          <TimeText time={startText} />
          {separator}
          <TimeText time={endText} />
        </Fragment>
      )}
    </div>
  );
}

export default React.memo(
  RangeResult,
  (prev, next) => JSON.stringify(prev) === JSON.stringify(next),
);
