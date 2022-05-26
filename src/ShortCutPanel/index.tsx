import React from 'react';
import './index.less';

/** 上 下 左 右 */
interface ShortCutPanelProps {
  prefixCls?: string;
  setRangeHoverValue?: any;
  rangeList: {
    label: string;
    onClick: () => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  }[];
  components?: any;
  needConfirmButton: boolean;
  locale?: any;
}

const ShortCutPanel = (props: ShortCutPanelProps) => {
  const { prefixCls = 'ant-picker', rangeList } = props;

  return (
    <div className={`${prefixCls}-shortcut-card`}>
      {rangeList.map((item) => (
        <div
          onClick={item.onClick}
          onMouseEnter={item.onMouseEnter}
          onMouseLeave={item.onMouseLeave}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
};

export default ShortCutPanel;
