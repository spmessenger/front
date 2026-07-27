import { Button, Tooltip } from "antd";
import { YoutubeFilled } from "@ant-design/icons";

export default function YoutubeMetaButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip
      title="Watch on Your side"
      classNames={{
        root: "youtube-tooltip youtube-tooltip-mono",
      }}
    >
      <Button
        type="text"
        size="small"
        icon={<YoutubeFilled />}
        aria-label="Open YouTube preview"
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
        className="youtube-trigger-btn youtube-trigger-btn-mono"
        style={{
          height: "20px",
          minWidth: "20px",
          padding: 0,
          marginLeft: "auto",
        }}
      />
    </Tooltip>
  );
}
