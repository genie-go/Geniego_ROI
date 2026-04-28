package render

import (
  "bytes"
  "encoding/json"
  "text/template"
  "strings"
  "net/url"
)

type Contact struct{
  ContactID string                 `json:"contact_id"`
  Email string                     `json:"email"`
  Attributes map[string]interface{} `json:"attributes"`
}

func FuncMap() template.FuncMap {
  return template.FuncMap{
    "upper": strings.ToUpper,
    "lower": strings.ToLower,
    "default": func(def interface{}, v interface{}) interface{} {
      if v == nil { return def }
      switch x := v.(type) {
      case string:
        if x == "" { return def }
      }
      return v
    },
    "urlquery": func(s string) string { return url.QueryEscape(s) },
  }
}

func ParseContact(attrsJSON []byte) (map[string]interface{}, error) {
  if len(attrsJSON) == 0 { return map[string]interface{}{}, nil }
  var m map[string]interface{}
  if err := json.Unmarshal(attrsJSON, &m); err != nil { return nil, err }
  return m, nil
}

func RenderText(tmpl string, data map[string]interface{}) (string, error) {
  t, err := template.New("t").Funcs(FuncMap()).Option("missingkey=default").Parse(tmpl)
  if err != nil { return "", err }
  var buf bytes.Buffer
  if err := t.Execute(&buf, data); err != nil { return "", err }
  return buf.String(), nil
}
