import React from "react";
import MessengerApi from "@/lib/api/messenger";
import type { ChatMessageType } from "@/lib/types";
import { extractUrls } from "../utils";

type LinkPreviewState = Record<string, {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
  youtubeVideoId?: string;
}>;

export function useLinkPreviews(selectedMessages: ChatMessageType[]) {
  const [linkPreviewByUrl, setLinkPreviewByUrl] = React.useState<LinkPreviewState>({});
  const requestedUrlsRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    const messageUrls = selectedMessages.flatMap((message) => extractUrls(message.text));

    messageUrls.forEach((url) => {
      if (requestedUrlsRef.current.has(url)) {
        return;
      }
      requestedUrlsRef.current.add(url);

      void MessengerApi.getLinkPreview(url)
        .then(({ data }) => {
          setLinkPreviewByUrl((current) => ({
            ...current,
            [url]: {
              url: data.url,
              title: data.title ?? undefined,
              description: data.description ?? undefined,
              imageUrl: data.image_url ?? undefined,
              siteName: data.site_name ?? undefined,
              youtubeVideoId: data.youtube_video_id ?? undefined,
            },
          }));
        })
        .catch(() => undefined);
    });
  }, [selectedMessages]);

  return {
    linkPreviewByUrl,
  };
}

