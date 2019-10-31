package validator

import (
	"fmt"
	"strings"
)

// CheckIsValidPath checks if the relative path is valid,
// and returns an error or nil; it doesn't check that the path
// matches the actual file or directory.
func CheckIsValidPath(path string) error {
	if strings.Contains(path, "//") ||
		strings.Contains(path, "..") ||
		strings.Contains(path, "/.") ||
		strings.ContainsAny(path, "\\?:;,<>[]{}\000\r\n") {
		return fmt.Errorf("Bad path: %s", path)
	}
	return nil
}
