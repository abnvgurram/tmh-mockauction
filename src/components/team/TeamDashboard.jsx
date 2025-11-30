// src/components/team/TeamDashboard.jsx
import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Stack,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Logout,
  Sports,
  Refresh,
  ThumbDown,
  Undo as UndoIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

// IPL Team Colors Configuration
const TEAM_COLORS = {
  csk: {
    primary: '#d6d60aff',
    secondary: '#0082CA',
    gradient: 'linear-gradient(135deg, #FFFF00 0%, #FDB913 100%)',
    textColor: '#000',
  },
  mi: {
    primary: '#004BA0',
    secondary: '#D1AB3E',
    gradient: 'linear-gradient(135deg, #004BA0 0%, #0066B2 100%)',
    textColor: '#fff',
  },
  rcb: {
    primary: '#EC1C24',
    secondary: '#000000',
    gradient: 'linear-gradient(135deg, #EC1C24 0%, #C8102E 100%)',
    textColor: '#fff',
  },
  kkr: {
    primary: '#3A225D',
    secondary: '#FFD700',
    gradient: 'linear-gradient(135deg, #3A225D 0%, #2E1A47 100%)',
    textColor: '#fff',
  },
  dc: {
    primary: '#004C93',
    secondary: '#EF1B23',
    gradient: 'linear-gradient(135deg, #004C93 0%, #003976 100%)',
    textColor: '#fff',
  },
  pbks: {
    primary: '#ED1B24',
    secondary: '#C0C0C0',
    gradient: 'linear-gradient(135deg, #ED1B24 0%, #B71C1C 100%)',
    textColor: '#fff',
  },
  rr: {
    primary: '#254AA5',
    secondary: '#EA1A85',
    gradient: 'linear-gradient(135deg, #254AA5 0%, #1E3A8A 100%)',
    textColor: '#fff',
  },
  srh: {
    primary: '#FF822A',
    secondary: '#000000',
    gradient: 'linear-gradient(135deg, #FF822A 0%, #F76C1D 100%)',
    textColor: '#000',
  },
  gt: {
    primary: '#1C2841',
    secondary: '#b19914ff',
    gradient: 'linear-gradient(135deg, #1C2841 0%, #0F1729 100%)',
    textColor: '#fff',
  },
  lsg: {
    primary: '#1C4595',
    secondary: '#FFC627',
    gradient: 'linear-gradient(135deg, #1C4595 0%, #15357A 100%)',
    textColor: '#fff',
  },
};

const TeamDashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // State
  const [teamData, setTeamData] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [auctionState, setAuctionState] = useState(null);
  const [mySquad, setMySquad] = useState([]);
  const [bidHistory, setBidHistory] = useState([]);
  const [notInterestedPlayers, setNotInterestedPlayers] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [bidding, setBidding] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentTab, setCurrentTab] = useState(0);
  const [showRtmPopup, setShowRtmPopup] = useState(false);
  const [rtmPlayerData, setRtmPlayerData] = useState(null);
  const [rtmTimeout, setRtmTimeout] = useState(30);
  const [rtmProcessing, setRtmProcessing] = useState(false);
  const [auctionRules, setAuctionRules] = useState(null);
  const [pauseStartTime, setPauseStartTime] = useState(null);
  const [pauseElapsed, setPauseElapsed] = useState(0);

  // Get team colors based on team code
  const getTeamColors = () => {
    const teamCode = teamData?.team_code?.toLowerCase() || 'csk';
    return TEAM_COLORS[teamCode] || TEAM_COLORS.csk;
  };

  // Calculate next bid amount (memoized to prevent flickering)
  const nextBidAmount = useMemo(() => {
    if (!auctionState?.current_bid) return currentPlayer?.base_price || 0;
    
    const currentBid = auctionState.current_bid;
    let increment = 0.05;
    
    if (currentBid >= 1.00 && currentBid < 2.00) {
      increment = 0.10;
    } else if (currentBid >= 2.00 && currentBid < 5.00) {
      increment = 0.20;
    } else if (currentBid >= 5.00) {
      increment = 0.25;
    }
    
    return (parseFloat(currentBid) + increment).toFixed(2);
  }, [auctionState?.current_bid, currentPlayer?.base_price]);
  // Fetch auction rules
  const fetchAuctionRules = async () => {
    try {
      const { data, error } = await supabase.rpc('get_auction_rules');
      if (error) throw error;
      if (data && data.length > 0) {
        setAuctionRules(data[0]);
      }
    } catch (error) {
      console.error('Error fetching auction rules:', error);
    }
  };

  // Fetch team data
  const fetchData = async () => {
    setLoading(true);
    try {
      // Get team data
      const { data: teamInfo, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('team_code', currentUser?.team_code)
        .single();

      if (teamError) throw teamError;
      setTeamData(teamInfo);

      // Get auction state
      const { data: stateData, error: stateError } = await supabase
        .from('auction_state')
        .select('*')
        .single();

      if (stateError) throw stateError;
      setAuctionState(stateData);

      // Track pause time
      if (stateData?.auction_status === 'paused' && stateData?.pause_started_at) {
        setPauseStartTime(new Date(stateData.pause_started_at));
      } else {
        setPauseStartTime(null);
        setPauseElapsed(0);
      }

      // Get current player if exists
      if (stateData?.current_player_id) {
        const { data: playerData } = await supabase
          .from('players')
          .select('*')
          .eq('id', stateData.current_player_id)
          .single();
        
        setCurrentPlayer(playerData);

        // Get bid history for current player
        const { data: bidsData } = await supabase
          .from('bid_history')
          .select(`
            *,
            teams (team_name, team_code)
          `)
          .eq('player_id', stateData.current_player_id)
          .eq('is_valid', true)
          .order('timestamp', { ascending: false })
          .limit(5);
        
        setBidHistory(bidsData || []);
      } else {
        setCurrentPlayer(null);
        setBidHistory([]);
      }

      // Get my squad
      const { data: squadData, error: squadError } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', teamInfo.id)
        .in('status', ['retained', 'sold'])
        .order('sold_price', { ascending: false, nullsFirst: false });

      if (squadError) throw squadError;
      setMySquad(squadData || []);

      // Get not interested players
      const { data: prefsData } = await supabase
        .from('team_preferences')
        .select('player_id')
        .eq('team_id', teamInfo.id)
        .eq('is_not_interested', true);

      if (prefsData) {
        setNotInterestedPlayers(new Set(prefsData.map(p => p.player_id)));
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      setErrorMessage('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  // Update pause timer
  useEffect(() => {
    if (pauseStartTime) {
      const interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now - pauseStartTime) / 1000);
        setPauseElapsed(elapsed);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [pauseStartTime]);

  // Format pause duration
  const formatPauseDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    fetchData();
    fetchAuctionRules();
    
    // Subscribe to auction state changes for RTM
    const auctionChannel = supabase
      .channel('auction_state_rtm')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'auction_state',
        },
        async (payload) => {
          console.log('Auction state changed:', payload);
          
          // Check RTM only if enabled globally
          if (!auctionRules?.rtm_enabled_globally) {
            return;
          }
          
          // Check if a player is being sold and if we're the previous team
          if (payload.new && payload.new.current_player_id && teamData) {
            const { data: rtmCheck, error } = await supabase.rpc('check_rtm_eligibility', {
              input_player_id: payload.new.current_player_id,
            });
            
            if (!error && rtmCheck && rtmCheck.length > 0) {
              const eligibility = rtmCheck[0];
              
              // Check if WE are the previous team and RTM is triggered
              if (
                eligibility.is_eligible &&
                eligibility.previous_team_id === teamData.id &&
                eligibility.rtm_cards_available > 0 &&
                payload.new.highest_bidder_team_id &&
                payload.new.highest_bidder_team_id !== teamData.id &&
                teamData.rtm_enabled !== false
              ) {
                // Fetch player details
                const { data: playerData } = await supabase
                  .from('players')
                  .select('*')
                  .eq('id', payload.new.current_player_id)
                  .single();
                
                if (playerData) {
                  setRtmPlayerData({
                    player: playerData,
                    highestBid: payload.new.current_bid,
                    highestBidderName: 'Another team',
                  });
                  setShowRtmPopup(true);
                  setRtmTimeout(30);
                }
              }
            }
          }
        }
      )
      .subscribe();
    
    // Refresh every 2 seconds for live updates
    const interval = setInterval(() => {
      fetchData();
      fetchAuctionRules();
    }, 2000); // ← 2-second refresh rate
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(auctionChannel);
    };
  }, [teamData, auctionRules]);

  // RTM Timeout countdown
  useEffect(() => {
    if (showRtmPopup && rtmTimeout > 0) {
      const timer = setTimeout(() => {
        setRtmTimeout(rtmTimeout - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showRtmPopup && rtmTimeout === 0) {
      // Auto-decline after timeout
      handleDeclineRtm();
    }
  }, [showRtmPopup, rtmTimeout]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Place bid
  const handlePlaceBid = async () => {
    if (!currentPlayer || !teamData) {
      setErrorMessage('No player to bid on');
      return;
    }

    // Check if auction is paused
    if (auctionState?.auction_status === 'paused') {
      setErrorMessage('Auction is paused. Please wait for it to resume.');
      return;
    }

    setBidding(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const nextBid = parseFloat(nextBidAmount);
      
      const { data, error } = await supabase.rpc('place_bid', {
        input_player_id: currentPlayer.id,
        input_team_id: teamData.id,
        bid_amount: nextBid,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        if (data[0].success) {
          setSuccessMessage(`Bid placed: ₹${nextBid} Cr`);
          fetchData();
          setTimeout(() => setSuccessMessage(''), 2000);
        } else {
          setErrorMessage(data[0].message);
          setTimeout(() => setErrorMessage(''), 3000);
        }
      }
    } catch (error) {
      console.error('Error placing bid:', error);
      setErrorMessage('Failed to place bid');
    } finally {
      setBidding(false);
    }
  };

  // Mark as not interested
  const handleNotInterested = async () => {
    if (!currentPlayer || !teamData) return;

    try {
      await supabase.rpc('mark_player_not_interested', {
        input_team_id: teamData.id,
        input_player_id: currentPlayer.id,
        not_interested: true,
      });

      setNotInterestedPlayers(new Set([...notInterestedPlayers, currentPlayer.id]));
      setSuccessMessage('Marked as not interested');
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (error) {
      console.error('Error marking not interested:', error);
      setErrorMessage('Failed to mark as not interested');
    }
  };

  // Undo not interested
  const handleUndoNotInterested = async () => {
    if (!currentPlayer || !teamData) return;

    try {
      await supabase.rpc('mark_player_not_interested', {
        input_team_id: teamData.id,
        input_player_id: currentPlayer.id,
        not_interested: false,
      });

      const newSet = new Set(notInterestedPlayers);
      newSet.delete(currentPlayer.id);
      setNotInterestedPlayers(newSet);
      
      setSuccessMessage('Interest restored');
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (error) {
      console.error('Error undoing not interested:', error);
    }
  };

  // Handle USE RTM
  const handleUseRtm = async () => {
    if (!rtmPlayerData || !teamData) return;

    setRtmProcessing(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { data, error } = await supabase.rpc('use_rtm_card', {
        input_player_id: rtmPlayerData.player.id,
        input_team_id: teamData.id,
        matched_bid: rtmPlayerData.highestBid,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        if (data[0].success) {
          setSuccessMessage(`🎉 RTM Used! ${rtmPlayerData.player.name} returns to your team for ₹${rtmPlayerData.highestBid} Cr!`);
          setShowRtmPopup(false);
          setRtmPlayerData(null);
          fetchData();
          setTimeout(() => setSuccessMessage(''), 5000);
        } else {
          setErrorMessage(data[0].message);
        }
      }
    } catch (error) {
      console.error('Error using RTM:', error);
      setErrorMessage('Failed to use RTM card');
    } finally {
      setRtmProcessing(false);
    }
  };

  // Handle DECLINE RTM
  const handleDeclineRtm = async () => {
    if (!rtmPlayerData) return;

    setRtmProcessing(true);

    try {
      // Just close the popup - auctioneer will handle the decline via timeout
      setShowRtmPopup(false);
      setRtmPlayerData(null);
      setSuccessMessage('RTM declined');
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (error) {
      console.error('Error declining RTM:', error);
    } finally {
      setRtmProcessing(false);
    }
  };

  // Check if I'm the highest bidder
  const isHighestBidder = () => {
    return auctionState?.highest_bidder_team_id === teamData?.id;
  };

  // Filter squad
  const getFilteredSquad = () => {
    if (currentTab === 0) return mySquad;
    if (currentTab === 1) return mySquad.filter(p => p.is_retained);
    if (currentTab === 2) return mySquad.filter(p => !p.is_retained);
    return mySquad;
  };

  const teamColors = getTeamColors();
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Header - Team Colored */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 0,
          background: teamColors.gradient,
          borderBottom: `3px solid ${teamColors.secondary}`,
        }}
      >
        <Container maxWidth="xl">
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            justifyContent="space-between" 
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={2}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Sports sx={{ fontSize: { xs: 36, sm: 48 }, color: teamColors.textColor }} />
              <div>
                <Typography 
                  variant="h4" 
                  fontWeight="700" 
                  color={teamColors.textColor}
                  sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}
                >
                  {teamData?.team_name || 'Team'} Dashboard
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: teamColors.textColor, 
                    opacity: 0.9,
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }}
                >
                  {currentUser?.email}
                </Typography>
              </div>
            </Stack>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={fetchData}
                sx={{ 
                  color: 'white', 
                  borderColor: 'white',
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)',
                  }
                }}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<Logout />}
                onClick={handleLogout}
              >
                Logout
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Paper>

      {/* Content */}
      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 4 } }}>
        <Stack spacing={3}>
          {/* Messages */}
          {successMessage && (
            <Alert severity="success" onClose={() => setSuccessMessage('')}>
              {successMessage}
            </Alert>
          )}

          {errorMessage && (
            <Alert severity="error" onClose={() => setErrorMessage('')}>
              {errorMessage}
            </Alert>
          )}

          {/* Auction Paused Alert */}
          {auctionState?.auction_status === 'paused' && (
            <Alert severity="warning" icon="⏸️">
              <Typography variant="h6" fontWeight="700">
                AUCTION PAUSED
              </Typography>
              <Typography variant="body1">
                Paused for: {formatPauseDuration(pauseElapsed)}
              </Typography>
              <Typography variant="body2">
                Bidding is temporarily disabled. Please wait for the auctioneer to resume.
              </Typography>
            </Alert>
          )}

          {/* Auction Ended Alert */}
          {auctionState?.auction_status === 'completed' && (
            <Alert severity="info" icon="✅">
              <Typography variant="h6" fontWeight="700">
                AUCTION ENDED
              </Typography>
              <Typography variant="body1">
                The auction has been completed. View your final squad below.
              </Typography>
            </Alert>
          )}

          {/* No Auction Alert */}
          {auctionState?.auction_status === 'not_started' && (
            <Alert severity="info">
              <Typography variant="h6" fontWeight="700">
                No Auction in Progress
              </Typography>
              <Typography variant="body1">
                Please wait for the auctioneer to start the auction.
              </Typography>
            </Alert>
          )}

          {/* Team Stats Cards */}
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Card 
                elevation={0} 
                sx={{ 
                  background: `linear-gradient(135deg, ${teamColors.primary}dd 0%, ${teamColors.primary} 100%)`,
                  color: teamColors.textColor,
                  border: `2px solid ${teamColors.secondary}`,
                }}
              >
                <CardContent>
                  <Typography variant="h4" fontWeight="700" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
                    ₹{teamData?.current_purse || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Purse Remaining (Cr)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} md={3}>
              <Card 
                elevation={0} 
                sx={{ 
                  background: `linear-gradient(135deg, ${teamColors.primary}bb 0%, ${teamColors.primary}dd 100%)`,
                  color: teamColors.textColor,
                  border: `2px solid ${teamColors.secondary}`,
                }}
              >
                <CardContent>
                  <Typography variant="h4" fontWeight="700" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
                    {teamData?.squad_size || 0}/25
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Squad Size
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} md={3}>
              <Card 
                elevation={0} 
                sx={{ 
                  background: `linear-gradient(135deg, ${teamColors.secondary}dd 0%, ${teamColors.secondary} 100%)`,
                  color: teamColors.textColor === '#000' ? '#fff' : teamColors.textColor,
                  border: `2px solid ${teamColors.primary}`,
                }}
              >
                <CardContent>
                  <Typography variant="h4" fontWeight="700" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
                    {teamData?.os_count || 0}/8
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Overseas Players
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} md={3}>
              <Card 
                elevation={0} 
                sx={{ 
                  background: `linear-gradient(135deg, ${teamColors.secondary}bb 0%, ${teamColors.secondary}dd 100%)`,
                  color: teamColors.textColor === '#000' ? '#fff' : teamColors.textColor,
                  border: `2px solid ${teamColors.primary}`,
                }}
              >
                <CardContent>
                  <Typography variant="h4" fontWeight="700" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
                    {auctionRules?.rtm_enabled_globally ? (teamData?.rtm_cards || 0) : 'N/A'}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    {auctionRules?.rtm_enabled_globally ? 'RTM Cards Left' : 'RTM Disabled'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Detailed Stats */}
          <Paper 
            elevation={0} 
            sx={{ 
              p: { xs: 2, sm: 3 },
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              borderRadius: 2,
            }}
          >
            <Typography variant="h6" fontWeight="600" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              Squad Composition
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6} sm={3}>
                <Typography variant="body1" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  🧤 Wicket-keepers: <strong>{teamData?.wk_count || 0}</strong>
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body1" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  🏏 Batters: <strong>{teamData?.ba_count || 0}</strong>
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body1" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  🎯 Bowlers: <strong>{teamData?.bo_count || 0}</strong>
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body1" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  ⚡ All-rounders: <strong>{teamData?.ar_count || 0}</strong>
                </Typography>
              </Grid>
            </Grid>
          </Paper>
          {/* Current Player & Bidding */}
          {currentPlayer && auctionState?.auction_status !== 'completed' && auctionState?.auction_status !== 'not_started' ? (
            <Grid container spacing={3}>
              {/* Current Player */}
              <Grid item xs={12} md={7}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: { xs: 2, sm: 3 },
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="h6" fontWeight="600" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                    🎯 Current Player
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  
                  <Stack spacing={3}>
                    <Typography 
                      variant="h3" 
                      fontWeight="700" 
                      sx={{ 
                        color: teamColors.primary,
                        fontSize: { xs: '1.75rem', sm: '3rem' }
                      }}
                    >
                      {currentPlayer.name}
                    </Typography>
                    
                    <Stack direction="row" spacing={2} flexWrap="wrap">
                      <Chip 
                        label={currentPlayer.category} 
                        size="large" 
                        sx={{ 
                          bgcolor: teamColors.primary, 
                          color: teamColors.textColor,
                          fontWeight: 600,
                        }} 
                      />
                      <Chip 
                        label={currentPlayer.country.toUpperCase()} 
                        size="large"
                        sx={{ 
                          bgcolor: teamColors.secondary, 
                          color: teamColors.textColor === '#000' ? '#fff' : teamColors.textColor,
                          fontWeight: 600,
                        }}
                      />
                    </Stack>

                    <Typography variant="h5" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                      Base Price: ₹{currentPlayer.base_price} Cr
                    </Typography>

                    {auctionState?.current_bid > 0 && (
                      <Paper 
                        sx={{ 
                          p: { xs: 2, sm: 3 }, 
                          background: isHighestBidder() 
                            ? `linear-gradient(135deg, ${teamColors.primary}22 0%, ${teamColors.secondary}22 100%)`
                            : 'rgba(245, 245, 245, 0.9)',
                          border: isHighestBidder() 
                            ? `2px solid ${teamColors.primary}`
                            : '1px solid rgba(0, 0, 0, 0.08)',
                          borderRadius: 2,
                        }}
                      >
                        <Typography 
                          variant="h4" 
                          fontWeight="700" 
                          sx={{ 
                            color: isHighestBidder() ? teamColors.primary : 'text.primary',
                            fontSize: { xs: '1.5rem', sm: '2.125rem' }
                          }}
                        >
                          Current Bid: ₹{auctionState.current_bid} Cr
                        </Typography>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            color: isHighestBidder() ? teamColors.primary : 'text.secondary',
                            fontSize: { xs: '1rem', sm: '1.25rem' }
                          }}
                        >
                          {isHighestBidder() ? '🎉 You are the highest bidder!' : `Highest Bidder: ${bidHistory[0]?.teams?.team_name || 'Unknown'}`}
                        </Typography>
                      </Paper>
                    )}

                    {auctionState?.going_once && (
                      <Chip label="🔨 Going Once" color="warning" />
                    )}
                    
                    {auctionState?.going_twice && (
                      <Chip label="🔨🔨 Going Twice" color="error" />
                    )}

                    {/* Bidding Buttons - UPDATED WITH NEW NOT INTERESTED BUTTON */}
                    <Stack direction="row" spacing={2}>
                      <Button
                        fullWidth
                        variant="contained"
                        color="success"
                        size="large"
                        onClick={handlePlaceBid}
                        disabled={
                          bidding || 
                          loading || 
                          notInterestedPlayers.has(currentPlayer.id) ||
                          auctionState?.auction_status === 'paused' ||
                          auctionState?.auction_status === 'completed'
                        }
                        sx={{ 
                          py: 2, 
                          fontSize: { xs: '1rem', sm: '1.2rem' }, 
                          fontWeight: 'bold',
                        }}
                      >
                        {bidding ? 'Bidding...' : 
                         auctionState?.auction_status === 'paused' ? 'Paused' :
                         `Place Bid: ₹${nextBidAmount} Cr`}
                      </Button>

                      {!notInterestedPlayers.has(currentPlayer.id) ? (
                        <Button
                          variant="outlined"
                          color="error"
                          size="large"
                          onClick={handleNotInterested}
                          disabled={auctionState?.auction_status === 'paused'}
                          startIcon={<ThumbDown />}
                          sx={{ 
                            py: 2,
                            minWidth: '180px',
                            borderWidth: 2,
                            '&:hover': {
                              borderWidth: 2,
                            }
                          }}
                        >
                          Not Interested
                        </Button>
                      ) : (
                        <Button
                          variant="outlined"
                          size="large"
                          onClick={handleUndoNotInterested}
                          disabled={auctionState?.auction_status === 'paused'}
                          startIcon={<UndoIcon />}
                          sx={{ 
                            py: 2,
                            minWidth: '180px',
                            borderWidth: 2,
                            borderColor: teamColors.primary,
                            color: teamColors.primary,
                            '&:hover': {
                              borderWidth: 2,
                              borderColor: teamColors.primary,
                              bgcolor: `${teamColors.primary}11`,
                            }
                          }}
                        >
                          Undo
                        </Button>
                      )}
                    </Stack>

                    {notInterestedPlayers.has(currentPlayer.id) && (
                      <Alert severity="info">
                        You marked this player as not interested. Bidding disabled.
                      </Alert>
                    )}
                  </Stack>
                </Paper>
              </Grid>

              {/* Bid History */}
              <Grid item xs={12} md={5}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: { xs: 2, sm: 3 }, 
                    minHeight: 400,
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="h6" fontWeight="600" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                    📊 Live Bidding Activity
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  
                  {bidHistory.length > 0 ? (
                    <List>
                      {bidHistory.map((bid, index) => (
                        <ListItem 
                          key={bid.id}
                          sx={{ 
                            bgcolor: bid.team_id === teamData?.id 
                              ? `${teamColors.primary}22` 
                              : 'transparent',
                            borderRadius: 1,
                            mb: 1,
                            border: bid.team_id === teamData?.id 
                              ? `2px solid ${teamColors.primary}` 
                              : 'none',
                          }}
                        >
                          <ListItemText
                            primary={
                              <Typography fontWeight={index === 0 ? 'bold' : 'normal'}>
                                {bid.teams.team_code.toUpperCase()} - ₹{bid.bid_amount} Cr
                                {bid.team_id === teamData?.id && ' (You)'}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography color="text.secondary">
                      No bids yet. Be the first to bid!
                    </Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>
          ) : (
            !currentPlayer && auctionState?.auction_status === 'active' && (
              <Paper 
                elevation={0} 
                sx={{ 
                  p: { xs: 4, sm: 6 }, 
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  borderRadius: 2,
                }}
              >
                <Typography variant="h5" color="text.secondary" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                  Waiting for auctioneer to reveal a player...
                </Typography>
              </Paper>
            )
          )}
          {/* My Squad */}
          <Paper 
            elevation={0}
            sx={{
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <Box 
              sx={{ 
                p: 2, 
                background: teamColors.gradient,
                color: teamColors.textColor,
              }}
            >
              <Typography variant="h6" fontWeight="600" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                My Squad ({mySquad.length} players)
              </Typography>
            </Box>

            <Tabs 
              value={currentTab} 
              onChange={(e, v) => setCurrentTab(v)}
              sx={{
                '& .MuiTab-root': {
                  color: 'text.secondary',
                  fontWeight: 500,
                },
                '& .Mui-selected': {
                  color: teamColors.primary,
                  fontWeight: 600,
                },
                '& .MuiTabs-indicator': {
                  bgcolor: teamColors.primary,
                },
              }}
            >
              <Tab label={`All (${mySquad.length})`} />
              <Tab label={`Retained (${mySquad.filter(p => p.is_retained).length})`} />
              <Tab label={`Bought (${mySquad.filter(p => !p.is_retained).length})`} />
            </Tabs>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Player</strong></TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}><strong>Category</strong></TableCell>
                    <TableCell><strong>Country</strong></TableCell>
                    <TableCell><strong>Price</strong></TableCell>
                    <TableCell><strong>Type</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getFilteredSquad().length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography color="text.secondary">No players yet</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    getFilteredSquad().map((player) => {
                      // Determine acquisition type
                      const acquisitionType = player.acquired_via || (player.is_retained ? 'retained' : 'bid');
                      
                      // Set chip properties based on type
                      let chipLabel = 'Bought';
                      let chipColor = '#2196F3'; // Blue
                      
                      if (acquisitionType === 'retained') {
                        chipLabel = 'Retained';
                        chipColor = '#4CAF50'; // Green
                      } else if (acquisitionType === 'rtm') {
                        chipLabel = 'RTM';
                        chipColor = teamColors.primary; // Team's primary color
                      } else {
                        chipLabel = 'Bought';
                        chipColor = '#2196F3'; // Blue
                      }
                      
                      return (
                        <TableRow key={player.id} hover>
                          <TableCell>{player.name}</TableCell>
                          <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                            <Chip label={player.category} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={player.country.toUpperCase()}
                              size="small"
                              color={player.country === 'india' ? 'success' : 'secondary'}
                            />
                          </TableCell>
                          <TableCell>
                            ₹{player.is_retained ? player.retained_price : player.sold_price} Cr
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={chipLabel}
                              size="small"
                              sx={{
                                bgcolor: chipColor,
                                color: chipLabel === 'RTM' ? teamColors.textColor : 'white',
                                fontWeight: 600,
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* RTM (Right to Match) Popup - Only show if RTM enabled */}
          {auctionRules?.rtm_enabled_globally && (
            <Dialog
              open={showRtmPopup}
              onClose={() => {}}
              maxWidth="sm"
              fullWidth
              disableEscapeKeyDown
            >
              <DialogTitle 
                sx={{ 
                  background: teamColors.gradient,
                  color: teamColors.textColor,
                  textAlign: 'center',
                }}
              >
                🎴 RIGHT TO MATCH AVAILABLE!
              </DialogTitle>
              <DialogContent sx={{ mt: 3 }}>
                <Stack spacing={3}>
                  <Alert severity="warning" icon="⚠️">
                    <Typography variant="h6" fontWeight="700">
                      Your previous player is about to be sold!
                    </Typography>
                  </Alert>

                  {rtmPlayerData && (
                    <>
                      <Paper 
                        sx={{ 
                          p: 3, 
                          bgcolor: 'grey.50',
                          border: '2px solid',
                          borderColor: teamColors.primary,
                        }}
                      >
                        <Typography variant="h4" fontWeight="700" gutterBottom color={teamColors.primary}>
                          {rtmPlayerData.player.name}
                        </Typography>
                        <Stack direction="row" spacing={2} mb={2}>
                          <Chip 
                            label={rtmPlayerData.player.category} 
                            sx={{ bgcolor: teamColors.primary, color: teamColors.textColor }}
                          />
                          <Chip 
                            label={rtmPlayerData.player.country.toUpperCase()} 
                            color={rtmPlayerData.player.country === 'india' ? 'success' : 'secondary'}
                          />
                        </Stack>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="h5" color="error.main" fontWeight="700">
                          Highest Bid: ₹{rtmPlayerData.highestBid} Cr
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                          {rtmPlayerData.highestBidderName}
                        </Typography>
                      </Paper>

                      <Paper sx={{ p: 2, bgcolor: 'info.light' }}>
                        <Typography variant="body1" color="white" gutterBottom>
                          <strong>Your RTM Cards:</strong> {teamData?.rtm_cards}
                        </Typography>
                        <Typography variant="body1" color="white" gutterBottom>
                          <strong>Your Purse:</strong> ₹{teamData?.current_purse} Cr
                        </Typography>
                        <Typography variant="body1" color="white">
                          <strong>Cost to use RTM:</strong> ₹{rtmPlayerData.highestBid} Cr
                        </Typography>
                      </Paper>

                      <Alert 
                        severity={rtmTimeout <= 10 ? 'error' : 'warning'}
                        icon="⏱️"
                      >
                        <Typography variant="h5" fontWeight="700">
                          Decide in: {rtmTimeout} seconds
                        </Typography>
                        <Typography variant="body2">
                          Auto-decline after timeout
                        </Typography>
                      </Alert>

                      {teamData && teamData.current_purse < rtmPlayerData.highestBid && (
                        <Alert severity="error">
                          ⚠️ Insufficient purse! You cannot afford this RTM.
                        </Alert>
                      )}

                      {teamData && teamData.rtm_cards <= 0 && (
                        <Alert severity="error">
                          ⚠️ No RTM cards remaining!
                        </Alert>
                      )}
                    </>
                  )}
                </Stack>
              </DialogContent>
              <DialogActions sx={{ p: 3, gap: 2 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  size="large"
                  onClick={handleDeclineRtm}
                  disabled={rtmProcessing}
                  sx={{ py: 2 }}
                >
                  ❌ DECLINE
                </Button>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={handleUseRtm}
                  disabled={
                    rtmProcessing ||
                    !teamData ||
                    teamData.rtm_cards <= 0 ||
                    teamData.current_purse < (rtmPlayerData?.highestBid || 0)
                  }
                  sx={{
                    py: 2,
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                  }}
                >
                  {rtmProcessing ? 'Processing...' : `🎴 USE RTM - ₹${rtmPlayerData?.highestBid || 0} Cr`}
                </Button>
              </DialogActions>
            </Dialog>
          )}
        </Stack>
      </Container>
    </Box>
  );
};

export default TeamDashboard;