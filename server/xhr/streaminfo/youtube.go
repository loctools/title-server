package streaminfo

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
)

// youtubeFormatsEntry defines a single
// entry in streamingData.formats array
type youtubeFormatsEntry struct {
	URL      string `json:"url"`
	MimeType string `json:"mimeType"`
	Width    int    `json:"width"`
	Height   int    `json:"height"`
}

// youtubePlayerResponse defines a player_response JSON response
// as returned from YouTube
type youtubePlayerResponse struct {
	StreamingData struct {
		Formats          []youtubeFormatsEntry `json:"formats"`
		ExpiresInSeconds string                `json:"expiresInSeconds"`
	} `json:"streamingData"`
}

var reExtractYoutubeTimestamp = regexp.MustCompile(`\bexpire=(\d+)`)

func getYoutubeStreamInfo(videoID string) (*StreamInfo, error) {
	infoURL := "https://www.youtube.com/get_video_info?html5=1&video_id=" + videoID
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

	values, err := url.ParseQuery(string(content))
	if err != nil {
		return nil, err
	}

	playerResponseJSON := values.Get("player_response")
	if playerResponseJSON == "" {
		return nil, errors.New("No player_response parameter found")
	}

	//fmt.Printf("%s\n\n\n", playerResponseJSON)

	var response youtubePlayerResponse
	err = json.Unmarshal([]byte(playerResponseJSON), &response)
	if err != nil {
		return nil, err
	}

	/*
		for i := 0; i < len(response.StreamingData.Formats); i++ {
			f := response.StreamingData.Formats[i]
			fmt.Printf("\t - %dx%d - %s\n", f.Width, f.Height, f.MimeType)
		}
	*/

	if len(response.StreamingData.Formats) > 0 {
		return getStreamInfoFromYoutubeEntry(response.StreamingData.Formats[0])
	}

	return nil, errors.New("No video formats found")
}

func getStreamInfoFromYoutubeEntry(entry youtubeFormatsEntry) (*StreamInfo, error) {
	streamInfo := &StreamInfo{}
	streamInfo.URL = entry.URL
	streamInfo.Width = entry.Width
	streamInfo.Height = entry.Height

	matches := reExtractYoutubeTimestamp.FindStringSubmatch(entry.URL)
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
