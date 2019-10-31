`empty.mp4` is an empty 1x1px MP4 video file, 3-hour long,
with 1fps, that is used as a dummy video to render subtitles
when no video is available.

It was generated with the following command:

    $ ffmpeg -t 10800 -s 1x1 -f rawvideo -pix_fmt rgb24 -r 1 -i /dev/zero empty.mp4 -vcodec mpeg4
