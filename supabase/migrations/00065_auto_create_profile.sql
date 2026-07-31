-- Auto-create profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    user_id, first_name, last_name, display_name,
    birth_date, country, preferred_language
  )
  values (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'display_name',
    (nullif(new.raw_user_meta_data->>'birth_date',''))::date,
    new.raw_user_meta_data->>'country',
    new.raw_user_meta_data->>'preferred_language'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
