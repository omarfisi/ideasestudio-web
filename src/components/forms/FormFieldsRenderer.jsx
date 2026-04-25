import DynamicPublicForm from "./DynamicPublicForm.jsx";

export default function FormFieldsRenderer({
  formConfig,
  placementId,
  onSuccess,
  className = "",
}) {
  return (
    <DynamicPublicForm
      formConfig={formConfig}
      placementId={placementId}
      onSuccess={onSuccess}
      className={className}
    />
  );
}
