package streaminfo

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"regexp"
	"strconv"
)

// vimeoProgressiveEntry defines a single
// entry in request.files.progressive array
type vimeoProgressiveEntry struct {
	URL    string `json:"url"`
	MIME   string `json:"mime"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
}

// vimeoConfig defines a config JSON data
// as returned from Vimeo
type vimeoConfig struct {
	Request struct {
		Files struct {
			Progressive []vimeoProgressiveEntry `json:"progressive"`
		} `json:"files"`
		Expires int `json:"expires"`
	} `json:"request"`
}

var reExtractVimeoTimestamp = regexp.MustCompile(`\bexp=(\d+)`)

func getVimeoStreamInfo(videoID string) (*StreamInfo, error) {
	infoURL := "https://player.vimeo.com/video/" + videoID
	fmt.Printf("Loading %s\n", infoURL)
	resp, err := http.Get(infoURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	content, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	re := regexp.MustCompile(`\svar config = ({.*?});\s`)
	matches := re.FindAllSubmatch(content, -1)
	if len(matches) == 0 {
		return nil, errors.New("No config data found")
	}

	configJSON := matches[0][1]

	var config vimeoConfig
	err = json.Unmarshal(configJSON, &config)
	if err != nil {
		return nil, err
	}

	//fmt.Printf("\n%q\n\n", config)

	for _, entry := range config.Request.Files.Progressive {
		if entry.Width == 640 {
			return getStreamInfoFromVimeoEntry(entry)
		}
	}

	if len(config.Request.Files.Progressive) > 0 {
		return getStreamInfoFromVimeoEntry(config.Request.Files.Progressive[0])
	}

	return nil, errors.New("No video formats found")
}

func getStreamInfoFromVimeoEntry(entry vimeoProgressiveEntry) (*StreamInfo, error) {
	streamInfo := &StreamInfo{}
	streamInfo.URL = entry.URL
	streamInfo.Width = entry.Width
	streamInfo.Height = entry.Height

	matches := reExtractVimeoTimestamp.FindStringSubmatch(entry.URL)
	if len(matches) == 0 {
		return nil, errors.New("Can't extract the expiration timestamp from the URL")
	}

	i, err := strconv.Atoi(matches[1])
	if err != nil {
		return nil, err
	}
	streamInfo.Expires = i

	return streamInfo, nil
}
