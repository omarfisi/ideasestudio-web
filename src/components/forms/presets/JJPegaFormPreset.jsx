import FormFieldsRenderer from "../FormFieldsRenderer.jsx";

export default function JJPegaFormPreset({ formConfig, placementId, onSuccess }) {
  return (
    <div className="jj-crm-form-renderer">
      <FormFieldsRenderer
        formConfig={formConfig}
        placementId={placementId}
        onSuccess={onSuccess}
      />
    </div>
  );
}
