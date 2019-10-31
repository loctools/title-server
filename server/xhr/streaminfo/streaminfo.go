package streaminfo

import (
	"crypto/sha1"
	"encoding/json"
	"errors"
	"fmt"
	"io"
)

// GetInfo fetches a current stream URL for the video,
// suitable for display via HTML5 <video> tag.
// An external secret string is provided to verify the signature.
func GetInfo(platform string, videoID string, signature string, secret string) ([]byte, error) {
	// verify the signature
	h := sha1.New()
	io.WriteString(h, platform)
	io.WriteString(h, videoID)
	io.WriteString(h, secret)
	testSignature := fmt.Sprintf("%x", h.Sum(nil))

	if testSignature != signature {
		return nil, errors.New("Signature mismatch")
	}

	streamInfo, err := internalGetInfo(platform, videoID)
	if err != nil {
		return nil, err
	}
	return json.Marshal(streamInfo)
}

func internalGetInfo(platform string, videoID string) (*StreamInfo, error) {
	if platform == "Vimeo" {
		return getVimeoStreamInfo(videoID)
	}
	if platform == "YouTube" {
		return getYoutubeStreamInfo(videoID)
	}
	return nil, fmt.Errorf("Unknown platform: %s", platform)
}
