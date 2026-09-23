import {
  ArrowLeft01Icon,
  Building03Icon,
  Call02Icon,
  Globe02Icon,
  Link01Icon,
  Location01Icon,
  Mail01Icon,
  MapsLocation01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useForm } from 'react-hook-form';
import { COUNTRIES, INDIAN_STATES } from '../../lib/constants';
import { organisationSchema, type OrganisationFormValues } from '../../lib/schemas';
import { useBusinessTypes } from '../../lib/useBusinessTypes';
import { zodResolver } from '../../lib/zodResolver';
import { useSignupStore } from '../../store/signupStore';
import { SelectField, TextField } from '../ui/Fields';

type OrganisationStepProps = {
  onBack: () => void;
  onSubmit: (values: OrganisationFormValues) => void;
  isSubmitting: boolean;
};

export function OrganisationStep({ onBack, onSubmit, isSubmitting }: OrganisationStepProps) {
  const account = useSignupStore((state) => state.account);
  const organisation = useSignupStore((state) => state.organisation);
  const setOrganisation = useSignupStore((state) => state.setOrganisation);
  const { types: businessTypes } = useBusinessTypes();

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<OrganisationFormValues>({
    resolver: zodResolver(organisationSchema),
    defaultValues: {
      name: '',
      contactNumber: account?.mobileNumber ?? '',
      email: account?.email ?? '',
      website: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      country: 'India',
      pincode: '',
      ...organisation,
    },
  });

  const businessType = watch('businessType');
  const state = watch('state');
  const country = watch('country');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Organisation profile</h2>
        <p className="mt-1 text-sm text-mute">Tell us where feedback will be collected.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextField
            label="Business / Organization Name"
            icon={Building03Icon}
            placeholder="Enter your organization name"
            error={errors.name?.message}
            {...register('name')}
          />
        </div>

        <SelectField
          label="Business Type"
          icon={Building03Icon}
          placeholder={businessTypes.length ? 'Select business type' : 'No types available'}
          options={businessTypes}
          error={errors.businessType?.message}
          value={businessType ?? ''}
          disabled={businessTypes.length === 0}
          onChange={(event) =>
            setValue('businessType', event.target.value, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
        />

        <TextField
          label="Contact Number"
          icon={Call02Icon}
          inputMode="numeric"
          maxLength={10}
          placeholder="9876543210"
          error={errors.contactNumber?.message}
          {...register('contactNumber')}
        />

        <TextField
          label="Email"
          icon={Mail01Icon}
          type="email"
          placeholder="hello@organisation.in"
          error={errors.email?.message}
          {...register('email')}
        />

        <TextField
          label="Website"
          icon={Link01Icon}
          optional
          placeholder="https://www.organisation.in"
          error={errors.website?.message}
          {...register('website')}
        />

        <div className="sm:col-span-2 pt-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-fog">
            <HugeiconsIcon icon={Globe02Icon} size={16} color="currentColor" strokeWidth={1.8} />
            Address
          </p>
        </div>

        <div className="sm:col-span-2">
          <TextField
            label="Address Line 1"
            icon={Location01Icon}
            placeholder="Building, street, area"
            error={errors.addressLine1?.message}
            {...register('addressLine1')}
          />
        </div>

        <div className="sm:col-span-2">
          <TextField
            label="Address Line 2"
            icon={Location01Icon}
            optional
            placeholder="Landmark, wing, floor"
            error={errors.addressLine2?.message}
            {...register('addressLine2')}
          />
        </div>

        <TextField
          label="City"
          icon={MapsLocation01Icon}
          placeholder="Mumbai"
          error={errors.city?.message}
          {...register('city')}
        />

        <SelectField
          label="State"
          icon={MapsLocation01Icon}
          placeholder="Select state"
          options={INDIAN_STATES}
          error={errors.state?.message}
          value={state ?? ''}
          onChange={(event) =>
            setValue('state', event.target.value as OrganisationFormValues['state'], {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
        />

        <SelectField
          label="Country"
          icon={Globe02Icon}
          options={COUNTRIES}
          error={errors.country?.message}
          value={country}
          onChange={(event) =>
            setValue('country', event.target.value, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
        />

        <TextField
          label="Pincode"
          icon={Location01Icon}
          inputMode="numeric"
          maxLength={6}
          placeholder="400001"
          error={errors.pincode?.message}
          {...register('pincode')}
        />
      </div>

      <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => {
            setOrganisation(getValues());
            onBack();
          }}
          className="flex items-center justify-center gap-2 rounded-full border border-line px-5 py-3.5 text-sm font-semibold text-fog transition hover:border-primary/40 hover:text-primary"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={18} color="currentColor" strokeWidth={2} />
          Back
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-primary-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </button>
      </div>
    </form>
  );
}
