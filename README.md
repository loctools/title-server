# Title Server

This is a frontend for [Title](https://github.com/loctools/title) — Timed Text Localization Engine — that allows one to browse Title project directories and preview localized timed text tracks with the video.

# Status

**NOTICE: This software has a status of an early preview. It doesn't have all the functionality and documentation that an initial stable release is supposed to have, and its set of commands and their syntax are expected to change without ay notice and without backward compatibility. Use at your own risk.**

# Building the server

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
