
{{- define "genie-roi.name" -}}
genie-roi
{{- end -}}

{{- define "genie-roi.fullname" -}}
{{ include "genie-roi.name" . }}
{{- end -}}
