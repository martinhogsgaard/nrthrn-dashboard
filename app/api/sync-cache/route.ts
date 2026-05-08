// Sync sessions
  if (type === 'all' || type === 'sessions') {
    let allSessions: any[] = []
    let page = 1

    while (true) {
      const res = await fetch(
        `https://nrthrnstrong.marianatek.com/api/class_sessions?min_date=${start}&max_date=${end}&location=48718&per_page=100&page=${page}`,
        { headers: MT_HEADERS }
      )
      const data = await res.json()
      if (!data.data?.length) break
      allSessions = [...allSessions, ...data.data]
      if (data.meta?.pagination?.pages <= page) break
      page++
    }

    // Tæl Bruce spots for nylige sessions (sidste 7 dage)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const recentSessions = allSessions.filter(s => s.attributes.start_date >= sevenDaysAgo)
    
    const bruceSpotsBySessions: Record<string, number> = {}
    
    for (const session of recentSessions) {
      const reservationIds = session.relationships?.reservations?.data?.map((r: any) => r.id) || []
      if (reservationIds.length === 0) continue
      
      const reservations = await Promise.all(
        reservationIds.map((id: string) =>
          fetch(`https://nrthrnstrong.marianatek.com/api/reservations/${id}?include=tags,credit_transactions`, { headers: MT_HEADERS })
            .then(r => r.json()).catch(() => null)
        )
      )
      
      const bruceCount = reservations.filter(r => {
        if (!r?.data) return false
        const tags = r.data.relationships?.tags?.data || []
        const credits = r.data.relationships?.credit_transactions?.data || []
        return tags.length === 0 && credits.length === 0
      }).length
      
      bruceSpotsBySessions[session.id] = bruceCount
    }

    const sessionsToUpsert = allSessions.map((s: any) => {
      const startDT = new Date(s.attributes.start_datetime)
      const time = startDT.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Copenhagen' })
      return {
        id: s.id,
        date: s.attributes.start_date,
        time,
        class_type: s.attributes.class_type_display,
        instructor_name: s.attributes.instructor_names?.[0] || '',
        instructor_profile_id: s.relationships?.employee_public_profiles?.data?.[0]?.id || null,
        capacity: s.attributes.capacity || 0,
        participants: s.attributes.standard_reservation_user_count || 0,
        bruce_spots: bruceSpotsBySessions[s.id] || 0,
        location_id: s.relationships?.location?.data?.id || '48718',
        updated_at: new Date().toISOString(),
      }
    })

    if (sessionsToUpsert.length > 0) {
      const { error } = await supabase
        .from('sessions_cache')
        .upsert(sessionsToUpsert, { onConflict: 'id' })
      results.sessions = error ? `Fejl: ${error.message}` : `${sessionsToUpsert.length} sessions synkroniseret`
    }
  }