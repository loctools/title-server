# Title Server

This is a frontend for [Title](https://github.com/loctools/title) — Timed Text Localization Engine — that allows one to browse Title project directories and preview localized timed text tracks with the video.

Here's a preview of its UI, with [Subtitles and captions overview](https://vimeo.com/358296408) instructional video from Vimeo Support.

![preview](https://user-images.githubusercontent.com/1728158/67984877-e3888100-fbe4-11e9-89be-933f7aca50f3.png)

# Status

**NOTICE: This software has a status of an early preview. It doesn't have all the functionality and documentation that an initial stable release is supposed to have, and its set of commands and their syntax are expected to change without ay notice and without backward compatibility. Use at your own risk.**

# Building and running the server

```sh
$ cd server

# build

$ go build -o server *.go

# create a configuration file

$ mkdir ~/.title-server
$ cp config.json.example ~/.title-server/config.json
$ nano ~/.title-server/config.json

# run the server

$ ./server
```

# Questions / Comments?

Join the chat in Gitter: https://gitter.im/loctools/community
