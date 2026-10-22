import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { loginSchema, type LoginValues } from '../api/contract';
import { TypedApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Field';
import { InlineNotice } from '../components/States';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const { me, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [failure, setFailure] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (me) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? '/'} replace />;
  }

  const onSubmit = async (values: LoginValues) => {
    setFailure(null);
    try {
      await signIn(values.email, values.password);
      navigate('/', { replace: true });
    } catch (error) {
      // AC-02: the message is identical whether or not the account exists.
      setFailure(
        error instanceof TypedApiError
          ? error.message
          : 'The school server could not be reached. Check your connection and try again.',
      );
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>Unity Secondary School</p>
          <h1 className={styles.title}>Sign in</h1>
          <p className={styles.subtitle}>
            Use the account the school office issued you. Records are visible according to your role and the classes
            or children attached to you.
          </p>
        </div>

        {failure ? <InlineNotice tone="warning">{failure}</InlineNotice> : null}

        <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
          <Input
            label="Email address"
            type="email"
            autoComplete="username"
            required
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            error={errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
            Sign in
          </Button>
        </form>

        <p className={styles.footnote}>
          Locked out after repeated attempts? The office can reset the login without touching the pupil&apos;s
          academic record.
        </p>
      </div>
    </div>
  );
}
