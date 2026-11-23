- Email campaigns are sent by the send-campaign function using the active SMTP provider; scheduled ones are picked up by an hourly job. Why: reuse existing mail setup and keep background checks cheap.

- CRM data policies use public.is_staff() (admin/loan_officer/processor/assistant); shared CRM config uses public.is_app_member(). Why: sign-up is open, so "signed in" is not a trust boundary.
