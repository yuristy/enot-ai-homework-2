// app/src/features/requests/useRequests.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, isAnonymousSession, ensureSession } from '../../lib/supabaseClient';
import { getLimitErrorMessage } from '../../lib/limits';
import type { PhotoRequest, RequestType } from '../../lib/types';

interface RequestRow {
  id: number;
  request_type: RequestType;
  place_id: number | null;
  wanted_date: string | null;
  comment: string | null;
  author_id: string;
  created_at: string;
}

function toRequest(row: RequestRow): PhotoRequest {
  return {
    id: row.id,
    requestType: row.request_type,
    placeId: row.place_id,
    wantedDate: row.wanted_date,
    comment: row.comment,
    authorId: row.author_id,
    createdAt: row.created_at,
  };
}

export function useRequests() {
  const [requests, setRequests] = useState<PhotoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchRequests = useCallback(async () => {
    // Only show the full-page loading state for the initial fetch. Refetches
    // triggered after a successful create (see `create` below) must not flip
    // `loading` back to true, because RequestsScreen unmounts its whole tree
    // (including RequestForm and its "Заявка опубликована." success message)
    // while `loading` is true — that would wipe the just-shown confirmation
    // before the user ever sees it.
    if (!hasLoadedOnce.current) {
      setLoading(true);
    }
    const { data, error: fetchError } = await supabase
      .from('requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setRequests((data as RequestRow[]).map(toRequest));
      setError(null);
    }
    setLoading(false);
    hasLoadedOnce.current = true;
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  async function create(input: {
    requestType: RequestType;
    placeId: number | null;
    wantedDate: string | null;
    comment: string;
  }): Promise<{ error: string | null }> {
    let session;
    try {
      session = await ensureSession();
    } catch {
      return { error: 'Не удалось создать сессию.' };
    }
    const { error: insertError } = await supabase.from('requests').insert({
      request_type: input.requestType,
      place_id: input.placeId,
      wanted_date: input.wantedDate,
      comment: input.comment,
      author_id: session.user.id,
    });
    if (insertError) {
      const limitMessage = getLimitErrorMessage(insertError.message, isAnonymousSession(session));
      return { error: limitMessage ?? insertError.message };
    }
    await fetchRequests();
    return { error: null };
  }

  return { requests, loading, error, refetch: fetchRequests, create };
}
