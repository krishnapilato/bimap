import { FormSchema, TableSchema } from '../../core/api/registry.models';

const GEO = '/api/v1/geo';

/** The same form description `GET /api/v1/registrations/schema/form` answers with. */
export const FORM_SCHEMA: FormSchema = {
  id: 'asset-registration',
  title: 'Asset registration',
  version: '2.0.0',
  cascade: ['region', 'provinceName', 'municipality', 'address', 'postalCode', 'assetName', 'istatCode', 'entityName'],
  sections: [
    {
      id: 'location',
      title: 'Where the asset stands',
      description: 'Each field narrows the one below it.',
      fields: [
        { name: 'region', label: 'Region', type: 'AUTOCOMPLETE', required: true, maxLength: 64, placeholder: 'Lombardia', lookupUrl: `${GEO}/regions`, options: [] },
        { name: 'provinceName', label: 'Province', type: 'AUTOCOMPLETE', required: true, maxLength: 64, placeholder: 'Varese', help: 'Only provinces of the chosen region are offered.', lookupUrl: `${GEO}/provinces?region={region}`, dependsOn: 'region', options: [] },
        { name: 'provinceCode', label: 'Province code', type: 'TEXT', required: true, maxLength: 2, pattern: '[A-Za-z]{2}', help: 'Filled in from the chosen province.', options: [] },
        { name: 'municipality', label: 'Municipality', type: 'AUTOCOMPLETE', required: true, maxLength: 96, help: 'Search by name, ISTAT code or cadastral code.', lookupUrl: `${GEO}/municipalities?region={region}&province={provinceCode}`, dependsOn: 'provinceName', options: [] },
        { name: 'address', label: 'Street', type: 'AUTOCOMPLETE', required: true, maxLength: 256, placeholder: 'Via Giacomo Leopardi', help: 'Choosing a match fills in the postcode and the coordinates.', lookupUrl: `${GEO}/addresses?municipality={municipality}&province={provinceName}`, dependsOn: 'municipality', options: [] },
        { name: 'houseNumber', label: 'Number', type: 'TEXT', required: false, maxLength: 16, options: [] },
        { name: 'postalCode', label: 'CAP', type: 'AUTOCOMPLETE', required: false, maxLength: 5, pattern: '^$|[0-9]{5}', help: 'Usually a single value, offered as a list only where a comune has several.', lookupUrl: `${GEO}/postal-codes?municipality={municipality}&street={address}`, dependsOn: 'address', options: [] },
        { name: 'locality', label: 'Locality', type: 'TEXT', required: false, maxLength: 128, options: [] },
        { name: 'latitude', label: 'Latitude', type: 'COORDINATE', required: false, help: 'Captured from the map or from the resolved address.', options: [] },
        { name: 'longitude', label: 'Longitude', type: 'COORDINATE', required: false, options: [] },
      ],
    },
    {
      id: 'asset',
      title: 'The asset itself',
      fields: [
        { name: 'assetName', label: 'Asset name', type: 'TEXT', required: true, maxLength: 256, placeholder: 'Palazzo Estense', help: 'The one field with no lookup behind it.', options: [] },
        { name: 'istatCode', label: 'ISTAT code', type: 'TEXT', required: true, maxLength: 6, pattern: '[0-9]{6}', help: 'Filled in from the chosen municipality, and editable if it needs correcting.', lookupUrl: `${GEO}/municipalities?q={municipality}&region={region}`, dependsOn: 'municipality', options: [] },
        { name: 'cadastralCode', label: 'Cadastral code', type: 'TEXT', required: false, maxLength: 4, pattern: '^$|[A-Z][0-9]{3}', help: 'Agenzia delle Entrate code, filled in with the ISTAT code.', options: [] },
        { name: 'entityName', label: 'Responsible body', type: 'AUTOCOMPLETE', required: false, maxLength: 256, placeholder: 'Archivio di Stato', help: 'Only bodies seated in the chosen municipality are offered.', lookupUrl: `${GEO}/entity-codes?municipality={municipality}&province={provinceCode}`, dependsOn: 'municipality', options: [] },
        { name: 'entityBillingCode', label: 'Asset billing code', type: 'TEXT', required: false, maxLength: 16, help: 'Filled in from the chosen body.', options: [] },
        { name: 'assetReference', label: 'Internal reference', type: 'TEXT', required: false, maxLength: 64, help: 'Identifier carried over from the paper record.', options: [] },
      ],
    },
    {
      id: 'protection',
      title: 'Protection and title',
      fields: [
        { name: 'ownership', label: 'Ownership', type: 'TEXT', required: false, maxLength: 128, options: [] },
        { name: 'protectionMeasure', label: 'Protection measure', type: 'TEXT', required: false, maxLength: 256, options: [] },
        { name: 'constraintType', label: 'Constraint', type: 'TEXT', required: false, maxLength: 128, options: [] },
        { name: 'cadastralReference', label: 'Cadastral reference', type: 'TEXT', required: false, maxLength: 128, options: [] },
        { name: 'transcription', label: 'Transcription', type: 'TEXT', required: false, maxLength: 128, options: [] },
        { name: 'notes', label: 'Notes', type: 'TEXTAREA', required: false, maxLength: 2000, options: [] },
        {
          name: 'status',
          label: 'Status',
          type: 'SELECT',
          required: false,
          options: [
            { value: 'DRAFT', label: 'Draft' },
            { value: 'SUBMITTED', label: 'Submitted' },
            { value: 'VERIFIED', label: 'Verified' },
            { value: 'REJECTED', label: 'Rejected' },
            { value: 'ARCHIVED', label: 'Archived' },
          ],
        },
      ],
    },
  ],
};

/** The same table description `GET /api/v1/registrations/schema/table` answers with. */
export const TABLE_SCHEMA: TableSchema = {
  id: 'asset-registrations',
  defaultSort: 'createdAt',
  defaultDirection: 'desc',
  columns: [
    { field: 'assetName', header: 'Asset', type: 'TEXT', sortable: true, filterable: true, visibleByDefault: true },
    { field: 'municipality', header: 'Municipality', type: 'TEXT', sortable: true, filterable: true, visibleByDefault: true },
    { field: 'provinceCode', header: 'Province', type: 'TEXT', sortable: true, filterable: true, visibleByDefault: true },
    { field: 'region', header: 'Region', type: 'TEXT', sortable: true, filterable: true, visibleByDefault: true },
    { field: 'istatCode', header: 'ISTAT', type: 'TEXT', sortable: true, filterable: true, visibleByDefault: true },
    { field: 'fullAddress', header: 'Address', type: 'TEXT', sortable: false, filterable: true, visibleByDefault: true },
    { field: 'postalCode', header: 'CAP', type: 'TEXT', sortable: true, filterable: true, visibleByDefault: false },
    { field: 'entityName', header: 'Responsible body', type: 'TEXT', sortable: true, filterable: true, visibleByDefault: false },
    { field: 'entityBillingCode', header: 'Billing code', type: 'TEXT', sortable: false, filterable: true, visibleByDefault: false },
    { field: 'constraintType', header: 'Constraint', type: 'TEXT', sortable: true, filterable: true, visibleByDefault: false },
    { field: 'status', header: 'Status', type: 'SELECT', sortable: true, filterable: true, visibleByDefault: true },
    { field: 'createdBy', header: 'Surveyor', type: 'TEXT', sortable: true, filterable: true, visibleByDefault: false },
    { field: 'createdAt', header: 'Recorded', type: 'TEXT', sortable: true, filterable: false, visibleByDefault: true },
  ],
};
