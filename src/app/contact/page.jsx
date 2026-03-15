import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useI18n } from '@/i18n/I18nContext';

const WEB3FORMS_ACCESS_KEY = 'eead07b5-6013-4f7d-bc3c-181270658e28';

export default function ContactPage() {
  const { t } = useI18n();
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    const payload = {
      access_key: WEB3FORMS_ACCESS_KEY,
      subject: t('contact.subject'),
      botcheck: data.botcheck ?? '',
      name: data.name,
      email: data.email,
      message: data.message,
    };

    setStatus('sending');
    setMessage('');

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setStatus('success');
        setMessage(json.message || t('contact.success'));
        form.reset();
      } else {
        setStatus('error');
        setMessage(json.message || t('contact.error'));
      }
    } catch {
      setStatus('error');
      setMessage(t('contact.error'));
    }
  }

  return (
    <AppLayout title={t('contact.title')} containerMaxWidthClassName="max-w-2xl">
      <div className="prose prose-invert max-w-none">
        <p className="text-[#9ca3af] mb-8 leading-relaxed">
          {t('contact.description')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="checkbox"
            name="botcheck"
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
          />
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[#9ca3af] mb-2">
              {t('contact.name')}
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              disabled={status === 'sending'}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50 disabled:opacity-50"
              placeholder={t('contact.namePlaceholder')}
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#9ca3af] mb-2">
              {t('contact.email')}
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              disabled={status === 'sending'}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50 disabled:opacity-50"
              placeholder={t('contact.emailPlaceholder')}
            />
          </div>
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-[#9ca3af] mb-2">
              {t('contact.message')}
            </label>
            <textarea
              id="message"
              name="message"
              rows={5}
              required
              disabled={status === 'sending'}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50 resize-y disabled:opacity-50"
              placeholder={t('contact.messagePlaceholder')}
            />
          </div>
          <button
            type="submit"
            disabled={status === 'sending'}
            className="px-6 py-3 rounded-xl bg-[#007AFF] text-white font-medium hover:bg-[#0066CC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'sending' ? t('contact.sending') : t('contact.submit')}
          </button>
        </form>

        {message && (
          <p
            className={`mt-4 text-sm ${
              status === 'success' ? 'text-[#39FF14]' : status === 'error' ? 'text-[#FF5E5B]' : 'text-[#9ca3af]'
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </AppLayout>
  );
}
