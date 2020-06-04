package title

// Config defines a Title config file structure
type Config struct {
	//LocJSONFileComments []string `json:"locjsonFileComments"`
	Platform string `json:"platform"`
	VideoID  string `json:"videoId"`
	MediaURL string `json:"mediaUrl"`
}

// ProjectFolderName defines the name
// of Title project files.
const ProjectFolderName = ".title"

// LocJSONExt defines the extension
// of LocJSON files.
const LocJSONExt = ".locjson"

// MetadataExt defines the extension
// of metadata files.
const MetadataExt = ".meta"

// ConfigFilename defines the name
// of Title config files.
const ConfigFilename = "config.json"
