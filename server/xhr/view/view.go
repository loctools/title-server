package view

import (
	"crypto/sha1"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"os"
	"path"
	"path/filepath"

	"github.com/loctools/title-server/config"
	"github.com/loctools/title-server/title"
	"github.com/loctools/title-server/validator"
)

// Response defines a response for GetData endpoint
type Response struct {
	Platform    string `json:"platform"`
	VideoID     string `json:"videoId"`
	LocJSONURL  string `json:"locjsonUrl"`
	MetadataURL string `json:"metadataUrl"`
	RenewURL    string `json:"renewUrl,omitempty"`
	MediaURL    string `json:"mediaUrl,omitempty"`
}

// GetData gathers information about for a given file:
// its video provider / videoID, and URLs to renew the stream URL
// and to fetch metadata and localization files.
// An external secret string is provided to sign data.
func GetData(root string, relPath string, secret string) ([]byte, error) {
	err := validator.CheckIsValidPath(relPath)
	if err != nil {
		return nil, err
	}

	log.Printf("[metadata] Path: %s\n", relPath)

	fullPath := root + relPath

	// split the file path into directory,
	// filename (sans extension), and extension;
	// extension includes the dot (e.g. `.vtt`)

	dir := path.Dir(fullPath)
	lang := path.Base(fullPath)

	log.Printf("[metadata] dir=[%s] lang=[%s]\n", dir, lang)

	projectDir := filepath.Join(dir, title.ProjectFolderName)
	langEntries, err := title.GatherLanguageFiles(projectDir)
	if err != nil {
		return nil, err
	}

	for _, e := range langEntries {
		if e.Lang == lang {
			projectSubdir := filepath.Join(projectDir, e.SubDir)

			// read the configuration file in the same directory

			bytes, err := ioutil.ReadFile(path.Join(projectSubdir, title.ConfigFilename))
			if err != nil {
				return nil, err
			}

			var titleCfg title.Config
			err = json.Unmarshal(bytes, &titleCfg)
			if err != nil {
				return nil, err
			}

			response := &Response{}

			if titleCfg.Platform != "" && titleCfg.VideoID != "" {
				response.Platform = titleCfg.Platform
				response.VideoID = titleCfg.VideoID
				response.MediaURL = titleCfg.MediaURL

				// if media URL is not static,
				// create a signed renewal URL
				if response.MediaURL == "" {
					h := sha1.New()
					io.WriteString(h, response.Platform)
					io.WriteString(h, response.VideoID)
					io.WriteString(h, secret)
					signature := fmt.Sprintf("%x", h.Sum(nil))

					response.RenewURL = fmt.Sprintf(
						"%sxhr/streaminfo/%s/%s/%s",
						config.CFG.RootURL,
						response.Platform,
						response.VideoID,
						signature,
					)
				}
			}

			// determine the metadata file name and render its download URL

			metaLang, err := getMetadataLang(projectSubdir, lang, e.SrcLang)
			if err != nil {
				return nil, err
			}

			relParentDir := path.Dir(relPath)

			response.MetadataURL = fmt.Sprintf(
				"%sraw%s/%s/%s/meta",
				config.CFG.RootURL,
				relParentDir,
				e.SubDir,
				metaLang,
			)

			// render the LocJSON download URL

			response.LocJSONURL = fmt.Sprintf(
				"%sraw%s/%s/%s/locjson",
				config.CFG.RootURL,
				relParentDir,
				e.SubDir,
				lang,
			)

			return json.Marshal(response)
		}
	}

	return nil, errors.New("Target language data doesn't exist")
}

func getMetadataLang(dir string, lang string, srcLang string) (string, error) {
	metaFile := path.Join(dir, lang+title.MetadataExt)
	_, err := os.Stat(metaFile)
	if err == nil {
		return lang, nil
	}
	if !os.IsNotExist(err) || srcLang == lang {
		return "", err
	}

	metaFile = path.Join(dir, srcLang+title.MetadataExt)
	_, err = os.Stat(metaFile)
	if err == nil {
		return srcLang, nil
	}
	return "", err
}
