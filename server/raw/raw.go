package raw

import (
	"errors"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/loctools/title-server/config"
	"github.com/loctools/title-server/validator"
)

// SendFile sends a raw file to the client.
func SendFile(w http.ResponseWriter, relPath string) error {
	err := validator.CheckIsValidPath(relPath)
	if err != nil {
		return err
	}

	parts := strings.Split(relPath, "/")
	if len(parts) < 5 {
		return errors.New("Bad path")
	}

	dir := strings.Join(parts[:len(parts)-3], "/")
	subdir := parts[len(parts)-3]
	lang := parts[len(parts)-2]
	kind := parts[len(parts)-1]

	log.Printf("dir=[%s] subdir=[%s] lang=[%s] kind=[%s]", dir, subdir, lang, kind)

	if kind != "meta" && kind != "locjson" {
		return errors.New("Bad path")
	}

	fullPath := config.CFG.DataRoot + dir + "/.title/" + subdir + "/" + lang + "." + kind

	log.Printf("[raw] Final file path: %s", fullPath)

	f, err := os.Open(fullPath)
	if err != nil {
		return err
	}
	defer f.Close()

	w.Header().Add("Content-type", "text/json; charset=utf-8")
	io.Copy(w, f)

	return nil
}
