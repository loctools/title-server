package streaminfo

// StreamInfo defines a response for GetStreamInfo endpoint
type StreamInfo struct {
	URL     string `json:"url"`
	Expires int    `json:"expires"`
	Width   int    `json:"width"`
	Height  int    `json:"height"`
}
