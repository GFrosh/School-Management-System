import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '../layout/PageHeader';
import { useAccountProfiles, useCreateUserFromProfile } from '../api/hooks';
import { TypedApiError } from '../api/client';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Field';
import { Modal } from '../components/Modal';
import { Table, type Column } from '../components/Table';
import { Skeleton } from '../components/Skeleton';
import { ErrorState } from '../components/States';
import { useToast } from '../components/Toast';
import type { AccountProfile } from '../api/types';
import styles from './SimplePage.module.css';

const userSchema = z.object({
  profileKey: z.string().min(1, 'Select an existing profile'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/[A-Z]/, 'Password must contain an uppercase letter'),
  systemRole: z.enum(['admin', 'teacher', 'student', 'parent']).optional(),
});
type UserValues = z.infer<typeof userSchema>;

const profileLabel = (type: AccountProfile['profileType']) => type[0].toUpperCase() + type.slice(1);

export function UsersPage() {
  const profiles = useAccountProfiles();
  const createUser = useCreateUserFromProfile();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const availableProfiles = useMemo(() => (profiles.data?.data ?? []).filter((profile) => profile.canCreate), [profiles.data]);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UserValues>({ resolver: zodResolver(userSchema), defaultValues: { profileKey: '', email: '', password: '', systemRole: undefined } });
  const selectedProfile = availableProfiles.find((profile) => `${profile.profileType}:${profile.profileId}` === watch('profileKey'));

  const columns: Column<AccountProfile>[] = [
    { key: 'name', header: 'Profile', isRowHeader: true, render: (row) => row.name },
    { key: 'type', header: 'Type', render: (row) => profileLabel(row.profileType) },
    { key: 'email', header: 'Existing email', render: (row) => row.email ?? <span className={styles.muted}>Not provided</span> },
    {
      key: 'account',
      header: 'Account',
      render: (row) => row.userId ? <Badge tone="published">Linked</Badge> : <Badge tone="neutral">No login</Badge>,
    },
  ];

  const onSubmit = async (values: UserValues) => {
    const profile = availableProfiles.find((item) => `${item.profileType}:${item.profileId}` === values.profileKey);
    if (!profile) return;
    try {
      await createUser.mutateAsync({
        profileType: profile.profileType,
        profileId: profile.profileId,
        email: values.email,
        password: values.password,
        systemRole: profile.profileType === 'staff' ? values.systemRole : undefined,
      });
      toast.push(`Login created for ${profile.name}.`, 'success');
      setCreating(false);
      reset();
    } catch (error) {
      toast.push(error instanceof TypedApiError ? error.message : 'The user account was not created.', 'error');
    }
  };

  return (
    <>
      <PageHeader
        title="User accounts"
        description="Create login credentials for an existing school profile. Employment roles and login permissions are managed separately."
        actions={<Button variant="primary" onClick={() => setCreating(true)} disabled={availableProfiles.length === 0}>Create user account</Button>}
      />
      {profiles.isLoading ? <Skeleton rows={8} /> : profiles.isError ? <ErrorState error={profiles.error} onRetry={() => void profiles.refetch()} /> : (
        <Table caption="Existing profiles and login links" columns={columns} rows={profiles.data?.data ?? []} rowKey={(row) => `${row.profileType}-${row.profileId}`} emptyMessage="No profiles found." />
      )}
      <Modal
        open={creating}
        title="Create user account"
        description="Choose an existing profile, then set the email and temporary password used for login."
        confirmLabel="Create account"
        busy={isSubmitting || createUser.isPending}
        onConfirm={handleSubmit(onSubmit)}
        onClose={() => { setCreating(false); reset(); }}
      >
        <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
          <Select label="Existing profile" required error={errors.profileKey?.message} {...register('profileKey')} onChange={(event) => {
            const profile = availableProfiles.find((item) => `${item.profileType}:${item.profileId}` === event.target.value);
            setValue('profileKey', event.target.value, { shouldValidate: true });
            if (profile?.email) setValue('email', profile.email, { shouldValidate: true });
          }}>
            <option value="">Select a profile</option>
            {availableProfiles.map((profile) => <option key={`${profile.profileType}:${profile.profileId}`} value={`${profile.profileType}:${profile.profileId}`}>{profileLabel(profile.profileType)} — {profile.name}</option>)}
          </Select>
          {selectedProfile ? <p className={styles.muted}>This account will receive the {profileLabel(selectedProfile.profileType).toLowerCase()} role.</p> : null}
          {selectedProfile?.profileType === 'staff' ? (
            <Select label="System permission" required error={errors.systemRole?.message} {...register('systemRole')}>
              <option value="">Select a permission</option>
              <option value="admin">Administrator</option>
              <option value="teacher">Teacher</option>
              <option value="parent">Parent</option>
              <option value="student">Student</option>
            </Select>
          ) : null}
          <Input label="Login email" type="email" required error={errors.email?.message} {...register('email')} />
          <Input label="Temporary password" type="password" required hint="At least 8 characters and one uppercase letter." error={errors.password?.message} {...register('password')} />
        </form>
      </Modal>
    </>
  );
}
