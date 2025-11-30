// src/components/auctioneer/AuctioneerDashboard.jsx
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Logout,
  Gavel,
  Refresh,
  Casino,
  Visibility,
  People,
  CheckCircle,
  Cancel,
  Undo,
  Block,
  Pause,
  PlayArrow,
  Keyboard,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

const AuctioneerDashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // State
  const [auctionState, setAuctionState] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loggedInUsers, setLoggedInUsers] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [nextPlayer, setNextPlayer] = useState(null);
  const [currentSet, setCurrentSet] = useState(null);
  const [bidHistory, setBidHistory] = useState([]);
  const [stats, setStats] = useState({
    totalPlayers: 0,
    auctionPool: 0,
    retained: 0,
    sold: 0,
    unsold: 0,
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [pickingSet, setPickingSet] = useState(false);
  const [revealingPlayer, setRevealingPlayer] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [openSoldDialog, setOpenSoldDialog] = useState(false);
  const [rtmEligibility, setRtmEligibility] = useState(null);
  const [showRtmDialog, setShowRtmDialog] = useState(false);
  const [rtmTimeout, setRtmTimeout] = useState(30);
  const [rtmDecision, setRtmDecision] = useState(null);
  const [auctionRules, setAuctionRules] = useState(null);
  const [pauseProcessing, setPauseProcessing] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Set statistics
  const [setStatistics, setSetStatistics] = useState({
    total_sets: 0,
    completed_sets: 0,
    remaining_sets: 0,
    current_set_number: 0,
    unsold_sets: 0,
    unsold_player_count: 0,
    discarded_player_count: 0,
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ignore if typing in input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Ignore if dialog is open
      if (openSoldDialog || showRtmDialog) {
        return;
      }

      const key = e.key.toLowerCase();

      switch (key) {
        case 'r':
          // Reveal Player
          if (currentSet && !revealingPlayer && !loading) {
            handleRevealPlayer();
          }
          break;
        case '1':
          // Going Once
          if (currentPlayer && !auctionState?.going_once) {
            handleGoingOnce();
          }
          break;
        case '2':
          // Going Twice
          if (currentPlayer && auctionState?.going_once && !auctionState?.going_twice) {
            handleGoingTwice();
          }
          break;
        case 's':
          // SOLD
          if (currentPlayer && auctionState?.highest_bidder_team_id) {
            handleOpenSoldDialog();
          }
          break;
        case 'u':
          // Unsold
          if (currentPlayer) {
            handleMarkUnsold();
          }
          break;
        case 'z':
          // Undo
          handleUndo();
          break;
        case 'p':
          // Pick Random Set
          if (!pickingSet && !loading) {
            handlePickRandomSet();
          }
          break;
        case 'g':
          // Generate Sets
          if (!generating && !loading) {
            handleGenerateSets();
          }
          break;
        case ' ':
          // Refresh (Space)
          e.preventDefault();
          fetchData();
          break;
        case '?':
          // Show keyboard help
          setShowKeyboardHelp(!showKeyboardHelp);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [
    currentSet,
    currentPlayer,
    auctionState,
    revealingPlayer,
    loading,
    pickingSet,
    generating,
    openSoldDialog,
    showRtmDialog,
    showKeyboardHelp,
  ]);

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

  // Fetch all data
  const fetchData = async () => {
    try {
      // Fetch auction state
      const { data: stateData, error: stateError } = await supabase
        .from('auction_state')
        .select('*')
        .single();

      if (stateError) throw stateError;
      setAuctionState(stateData);

      // Fetch set statistics
      const { data: setStatsData, error: setStatsError } = await supabase
        .rpc('get_set_statistics');

      if (setStatsError) throw setStatsError;
      if (setStatsData && setStatsData.length > 0) {
        setSetStatistics(setStatsData[0]);
      }

      // Fetch current player if exists
      if (stateData?.current_player_id) {
        const { data: playerData } = await supabase
          .from('players')
          .select('*')
          .eq('id', stateData.current_player_id)
          .single();
        setCurrentPlayer(playerData);

        // Fetch bid history for current player
        const { data: bidsData } = await supabase
          .from('bid_history')
          .select(`
            *,
            teams (team_name, team_code)
          `)
          .eq('player_id', stateData.current_player_id)
          .eq('is_valid', true)
          .order('timestamp', { ascending: false })
          .limit(10);
        
        setBidHistory(bidsData || []);
      } else {
        setCurrentPlayer(null);
        setBidHistory([]);
      }

      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .order('team_name', { ascending: true });

      if (teamsError) throw teamsError;
      setTeams(teamsData || []);

      // Fetch logged in users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'team')
        .eq('is_logged_in', true);

      if (usersError) throw usersError;
      setLoggedInUsers(usersData || []);

      // Fetch player stats
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('status');

      if (playersError) throw playersError;

      const totalPlayers = playersData?.length || 0;
      const auctionPool = playersData?.filter(p => p.status === 'auction_pool').length || 0;
      const retained = playersData?.filter(p => p.status === 'retained').length || 0;
      const sold = playersData?.filter(p => p.status === 'sold').length || 0;
      const unsold = playersData?.filter(p => p.status === 'unsold').length || 0;

      setStats({ totalPlayers, auctionPool, retained, sold, unsold });

    } catch (error) {
      console.error('Error fetching data:', error);
      setErrorMessage('Failed to load auction data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchAuctionRules();
    
    // Subscribe to RTM decisions
    const rtmChannel = supabase
      .channel('rtm_usage_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rtm_usage',
        },
        (payload) => {
          console.log('RTM decision received:', payload);
          if (payload.new && currentPlayer) {
            if (payload.new.player_id === currentPlayer.id) {
              if (payload.new.declined) {
                setRtmDecision('declined');
                setTimeout(() => handleRtmDecline(), 1000);
              } else {
                setRtmDecision('used');
                setTimeout(() => handleRtmUsed(), 1000);
              }
            }
          }
        }
      )
      .subscribe();
    
    // Refresh every 3 seconds for live updates
    const interval = setInterval(() => {
      fetchData();
      fetchAuctionRules();
    }, 3000);
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(rtmChannel);
    };
  }, [currentPlayer]);

  // RTM Timeout countdown
  useEffect(() => {
    if (showRtmDialog && rtmTimeout > 0) {
      const timer = setTimeout(() => {
        setRtmTimeout(rtmTimeout - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showRtmDialog && rtmTimeout === 0) {
      handleRtmTimeout();
    }
  }, [showRtmDialog, rtmTimeout]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Pause/Resume handlers
  const handlePauseAuction = async () => {
    setPauseProcessing(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { data, error } = await supabase.rpc('pause_auction');
      if (error) throw error;

      if (data && data.length > 0 && data[0].success) {
        setSuccessMessage('⏸️ Auction paused!');
        fetchData();
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error pausing auction:', error);
      setErrorMessage('Failed to pause auction');
    } finally {
      setPauseProcessing(false);
    }
  };

  const handleResumeAuction = async () => {
    setPauseProcessing(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { data, error } = await supabase.rpc('resume_auction');
      if (error) throw error;

      if (data && data.length > 0 && data[0].success) {
        setSuccessMessage('▶️ Auction resumed!');
        fetchData();
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error resuming auction:', error);
      setErrorMessage('Failed to resume auction');
    } finally {
      setPauseProcessing(false);
    }
  };
  // Generate sets
  const handleGenerateSets = async () => {
    setGenerating(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const { data, error } = await supabase.rpc('generate_auction_sets', {
        players_per_set: 10,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setSuccessMessage(`Successfully generated ${data[0].set_count} sets with ${data[0].total_players} players!`);
        fetchData();
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error generating sets:', error);
      setErrorMessage(error.message || 'Failed to generate sets');
    } finally {
      setGenerating(false);
    }
  };

  // Pick random set
  const handlePickRandomSet = async () => {
    setPickingSet(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { data, error } = await supabase.rpc('get_next_random_set');

      if (error) throw error;

      if (data && data.length > 0) {
        setCurrentSet(data[0]);
        setSuccessMessage(`Selected Set ${data[0].set_number} with ${data[0].player_count} players`);
        
        // Update auction state
        await supabase
          .from('auction_state')
          .update({ 
            current_set: data[0].set_number,
            auction_status: 'active',
          })
          .eq('id', auctionState.id);

        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage('No more sets available');
      }
    } catch (error) {
      console.error('Error picking set:', error);
      setErrorMessage('Failed to pick random set');
    } finally {
      setPickingSet(false);
    }
  };

  // Reveal player
  const handleRevealPlayer = async () => {
    if (!currentSet) {
      setErrorMessage('Please pick a set first');
      return;
    }

    setRevealingPlayer(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Get random player from current set
      const { data: playerData, error: playerError } = await supabase.rpc(
        'get_random_player_from_set',
        { input_set_id: currentSet.set_id }
      );

      if (playerError) throw playerError;

      if (playerData && playerData.length > 0) {
        const player = playerData[0];
        
        // Reveal this player and get next player
        const { data: nextPlayerData, error: revealError } = await supabase.rpc(
          'reveal_player',
          {
            input_player_id: player.player_id,
            input_set_id: currentSet.set_id,
          }
        );

        if (revealError) throw revealError;

        setCurrentPlayer({
          id: player.player_id,
          name: player.player_name,
          category: player.category,
          country: player.country,
          base_price: player.base_price,
        });

        if (nextPlayerData && nextPlayerData.length > 0) {
          setNextPlayer({
            id: nextPlayerData[0].next_player_id,
            name: nextPlayerData[0].next_player_name,
            category: nextPlayerData[0].next_category,
            country: nextPlayerData[0].next_country,
            base_price: nextPlayerData[0].next_base_price,
          });
        } else {
          setNextPlayer(null);
          setSuccessMessage('Last player in this set!');
        }

        setBidHistory([]);
        fetchData();
      } else {
        setErrorMessage('No more players in this set');
        // Mark set as completed
        await supabase
          .from('sets')
          .update({ is_completed: true })
          .eq('id', currentSet.set_id);
        
        setCurrentSet(null);
      }
    } catch (error) {
      console.error('Error revealing player:', error);
      setErrorMessage('Failed to reveal player');
    } finally {
      setRevealingPlayer(false);
    }
  };

  // Promote next player to current (auto-flow)
  const promoteNextPlayer = async () => {
    if (nextPlayer && currentSet) {
      // Move next player to current
      setCurrentPlayer(nextPlayer);

      // Get new next player
      try {
        const { data: newNextPlayerData } = await supabase.rpc(
          'get_random_player_from_set',
          { input_set_id: currentSet.set_id }
        );

        if (newNextPlayerData && newNextPlayerData.length > 0) {
          setNextPlayer({
            id: newNextPlayerData[0].player_id,
            name: newNextPlayerData[0].player_name,
            category: newNextPlayerData[0].category,
            country: newNextPlayerData[0].country,
            base_price: newNextPlayerData[0].base_price,
          });
          
          // Update auction state with new current player
          await supabase.rpc('reveal_player', {
            input_player_id: newNextPlayerData[0].player_id,
            input_set_id: currentSet.set_id,
          });
        } else {
          // No more players in set
          setNextPlayer(null);
          setSuccessMessage('Set completed!');
          
          // Mark set as completed
          await supabase
            .from('sets')
            .update({ is_completed: true })
            .eq('id', currentSet.set_id);
          
          setCurrentSet(null);
        }
      } catch (error) {
        console.error('Error getting next player:', error);
      }
    } else {
      // No next player, clear current
      setCurrentPlayer(null);
      setNextPlayer(null);
    }

    setBidHistory([]);
    fetchData();
  };

  // Going Once
  const handleGoingOnce = async () => {
    try {
      await supabase.rpc('set_auction_going_state', { going_state: 'once' });
      setSuccessMessage('Going Once!');
      fetchData();
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (error) {
      console.error('Error setting going once:', error);
      setErrorMessage('Failed to set going once');
    }
  };

  // Going Twice
  const handleGoingTwice = async () => {
    try {
      await supabase.rpc('set_auction_going_state', { going_state: 'twice' });
      setSuccessMessage('Going Twice!');
      fetchData();
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (error) {
      console.error('Error setting going twice:', error);
      setErrorMessage('Failed to set going twice');
    }
  };

  // Open sold dialog - Check RTM first
  const handleOpenSoldDialog = async () => {
    if (!currentPlayer) {
      setErrorMessage('No player to sell');
      return;
    }
    if (!auctionState?.highest_bidder_team_id) {
      setErrorMessage('No bids placed yet');
      return;
    }

    // Check if RTM is enabled globally
    if (!auctionRules?.rtm_enabled_globally) {
      // RTM disabled, proceed directly to sold
      setOpenSoldDialog(true);
      return;
    }

    // Check if player is RTM eligible
    try {
      const { data: rtmData, error: rtmError } = await supabase.rpc('check_rtm_eligibility', {
        input_player_id: currentPlayer.id,
      });

      if (rtmError) throw rtmError;

      if (rtmData && rtmData.length > 0) {
        const eligibility = rtmData[0];

        // Check if RTM is applicable
        if (
          eligibility.is_eligible &&
          eligibility.previous_team_id &&
          eligibility.previous_team_id !== auctionState.highest_bidder_team_id &&
          eligibility.rtm_cards_available > 0 &&
          eligibility.team_purse >= auctionState.current_bid
        ) {
          // RTM is available - show RTM dialog
          setRtmEligibility(eligibility);
          setShowRtmDialog(true);
          setRtmTimeout(30);
          setRtmDecision(null);
          return;
        }
      }

      // No RTM or not eligible - proceed with normal sale
      setOpenSoldDialog(true);
    } catch (error) {
      console.error('Error checking RTM:', error);
      // If check fails, proceed with normal sale
      setOpenSoldDialog(true);
    }
  };

  // Handle RTM timeout
  const handleRtmTimeout = async () => {
    setSuccessMessage('RTM timeout - Player sold to highest bidder');
    await handleRtmDecline();
  };

  // Handle RTM decline (by previous team or timeout)
  const handleRtmDecline = async () => {
    if (!currentPlayer || !rtmEligibility) return;

    try {
      const { data, error } = await supabase.rpc('decline_rtm', {
        input_player_id: currentPlayer.id,
        previous_team_id: rtmEligibility.previous_team_id,
        highest_bidder_id: auctionState.highest_bidder_team_id,
        final_bid: auctionState.current_bid,
      });

      if (error) throw error;

      const winningTeam = teams.find(t => t.id === auctionState.highest_bidder_team_id);
      setSuccessMessage(`SOLD to ${winningTeam?.team_name} for ₹${auctionState.current_bid} Cr!`);
      setShowRtmDialog(false);
      setRtmEligibility(null);
      
      // Auto-promote next player
      await promoteNextPlayer();
      
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error declining RTM:', error);
      setErrorMessage('Failed to process RTM decline');
    }
  };

  // Handle override - skip RTM and sell directly
  const handleRtmOverride = async () => {
    if (!window.confirm('Skip RTM and sell directly to highest bidder?')) {
      return;
    }

    await handleRtmDecline();
  };

  // Close RTM dialog when RTM is used (triggered by previous team)
  const handleRtmUsed = async () => {
    const previousTeam = teams.find(t => t.id === rtmEligibility?.previous_team_id);
    setSuccessMessage(`${previousTeam?.team_name} used RTM! ${currentPlayer?.name} returns for ₹${auctionState.current_bid} Cr!`);
    setShowRtmDialog(false);
    setRtmEligibility(null);
    
    // Auto-promote next player
    await promoteNextPlayer();
    
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  // Confirm sold
  const handleConfirmSold = async () => {
    try {
      const { error } = await supabase.rpc('mark_player_sold', {
        input_player_id: currentPlayer.id,
        winning_team_id: auctionState.highest_bidder_team_id,
        final_price: auctionState.current_bid,
      });

      if (error) throw error;

      const winningTeam = teams.find(t => t.id === auctionState.highest_bidder_team_id);
      setSuccessMessage(`SOLD to ${winningTeam?.team_name} for ₹${auctionState.current_bid} Cr!`);
      setOpenSoldDialog(false);
      
      // Auto-promote next player
      await promoteNextPlayer();
      
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error marking as sold:', error);
      setErrorMessage('Failed to mark player as sold');
    }
  };

  // Mark as unsold
  const handleMarkUnsold = async () => {
    if (!currentPlayer) {
      setErrorMessage('No player to mark as unsold');
      return;
    }

    if (!window.confirm(`Mark ${currentPlayer.name} as UNSOLD?`)) {
      return;
    }

    try {
      const { error } = await supabase.rpc('mark_player_unsold', {
        input_player_id: currentPlayer.id,
      });

      if (error) throw error;

      setSuccessMessage(`${currentPlayer.name} marked as UNSOLD`);
      
      // Auto-promote next player
      await promoteNextPlayer();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error marking as unsold:', error);
      setErrorMessage('Failed to mark as unsold');
    }
  };

  // Undo last action
  const handleUndo = async () => {
    if (!window.confirm('Undo last action?')) {
      return;
    }

    try {
      const { data, error } = await supabase.rpc('undo_last_sale');

      if (error) throw error;

      if (data && data.length > 0 && data[0].success) {
        setSuccessMessage(data[0].message);
        fetchData();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(data[0]?.message || 'Nothing to undo');
      }
    } catch (error) {
      console.error('Error undoing:', error);
      setErrorMessage('Failed to undo action');
    }
  };

  // Get highest bidder info
  const getHighestBidderInfo = () => {
    if (!auctionState?.highest_bidder_team_id) return null;
    return teams.find(t => t.id === auctionState.highest_bidder_team_id);
  };

  const highestBidder = getHighestBidderInfo();

  // Memoize computed values for performance
  const canGenerateSets = useMemo(() => !generating && !loading, [generating, loading]);
  const canPickSet = useMemo(() => !pickingSet && !loading, [pickingSet, loading]);
  const canRevealPlayer = useMemo(() => currentSet && !revealingPlayer && !loading, [currentSet, revealingPlayer, loading]);
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 0,
          background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
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
              <Gavel sx={{ fontSize: { xs: 40, sm: 48 }, color: 'white' }} />
              <div>
                <Typography variant="h4" fontWeight="700" color="white" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                  Auctioneer Dashboard
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  Control the auction
                </Typography>
              </div>
            </Stack>
            <Stack direction="row" spacing={2}>
              <Tooltip title="Keyboard Shortcuts">
                <IconButton
                  onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
                  sx={{ color: 'white' }}
                >
                  <Keyboard />
                </IconButton>
              </Tooltip>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={fetchData}
                sx={{ color: 'white', borderColor: 'white' }}
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

          {/* Keyboard Shortcuts Help */}
          {showKeyboardHelp && (
            <Alert severity="info" onClose={() => setShowKeyboardHelp(false)}>
              <Typography variant="h6" fontWeight="600" gutterBottom>
                ⌨️ Keyboard Shortcuts
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6} sm={4} md={3}>
                  <Typography variant="body2"><strong>R</strong> - Reveal Player</Typography>
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <Typography variant="body2"><strong>1</strong> - Going Once</Typography>
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <Typography variant="body2"><strong>2</strong> - Going Twice</Typography>
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <Typography variant="body2"><strong>S</strong> - SOLD</Typography>
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <Typography variant="body2"><strong>U</strong> - Unsold</Typography>
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <Typography variant="body2"><strong>Z</strong> - Undo</Typography>
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <Typography variant="body2"><strong>P</strong> - Pick Set</Typography>
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <Typography variant="body2"><strong>G</strong> - Generate Sets</Typography>
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <Typography variant="body2"><strong>Space</strong> - Refresh</Typography>
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <Typography variant="body2"><strong>?</strong> - Toggle Help</Typography>
                </Grid>
              </Grid>
            </Alert>
          )}

          {/* Pause/Resume Controls */}
          {auctionState?.auction_status === 'active' && (
            <Paper sx={{ p: 2, bgcolor: 'warning.light' }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={pauseProcessing ? <CircularProgress size={20} color="inherit" /> : <Pause />}
                  onClick={handlePauseAuction}
                  disabled={pauseProcessing}
                >
                  {pauseProcessing ? 'Pausing...' : 'Pause Auction'}
                </Button>
                <Typography variant="body1" color="white">
                  Auction is LIVE
                </Typography>
              </Stack>
            </Paper>
          )}

          {auctionState?.auction_status === 'paused' && (
            <Paper sx={{ p: 2, bgcolor: 'info.main' }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Button
                  variant="contained"
                  color="success"
                  startIcon={pauseProcessing ? <CircularProgress size={20} color="inherit" /> : <PlayArrow />}
                  onClick={handleResumeAuction}
                  disabled={pauseProcessing}
                >
                  {pauseProcessing ? 'Resuming...' : 'Resume Auction'}
                </Button>
                <Typography variant="body1" color="white" fontWeight="600">
                  ⏸️ AUCTION PAUSED
                </Typography>
              </Stack>
            </Paper>
          )}

          {/* Stats Cards */}
          <Grid container spacing={2}>
            <Grid item xs={6} sm={4} md={1.5}>
              <Card elevation={0}>
                <CardContent>
                  <Typography variant="h4" fontWeight="700" color="primary.main" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                    {stats.totalPlayers}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Total
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} sm={4} md={1.5}>
              <Card elevation={0}>
                <CardContent>
                  <Typography variant="h4" fontWeight="700" color="secondary.main" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                    {stats.auctionPool}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Pool
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} sm={4} md={1.5}>
              <Card elevation={0}>
                <CardContent>
                  <Typography variant="h4" fontWeight="700" color="info.main" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                    {stats.retained}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Retained
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} sm={4} md={1.5}>
              <Card elevation={0}>
                <CardContent>
                  <Typography variant="h4" fontWeight="700" color="success.main" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                    {stats.sold}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Sold
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} sm={4} md={1.5}>
              <Card elevation={0}>
                <CardContent>
                  <Typography variant="h4" fontWeight="700" color="warning.main" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                    {stats.unsold}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Unsold
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} sm={4} md={1.5}>
              <Card elevation={0}>
                <CardContent>
                  <Typography variant="h4" fontWeight="700" color="primary.main" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                    {setStatistics.current_set_number || 0}/{setStatistics.total_sets || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Current Set
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} sm={4} md={1.5}>
              <Card elevation={0}>
                <CardContent>
                  <Typography variant="h4" fontWeight="700" color="secondary.main" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                    {setStatistics.remaining_sets || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Sets Left
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} sm={4} md={1.5}>
              <Card elevation={0}>
                <CardContent>
                  <Typography variant="h4" fontWeight="700" color="warning.main" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                    {setStatistics.unsold_player_count || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Unsold
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Set Controls */}
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
              🎲 Set Controls (Keyboard: G, P, R)
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={4}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handleGenerateSets}
                  disabled={!canGenerateSets}
                  startIcon={generating ? <CircularProgress size={20} color="inherit" /> : <Casino />}
                >
                  {generating ? 'Generating...' : 'Generate Sets (G)'}
                </Button>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Button
                  fullWidth
                  variant="contained"
                  color="secondary"
                  size="large"
                  onClick={handlePickRandomSet}
                  disabled={!canPickSet}
                  startIcon={pickingSet ? <CircularProgress size={20} color="inherit" /> : <Casino />}
                >
                  {pickingSet ? 'Picking...' : 'Pick Random Set (P)'}
                </Button>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  size="large"
                  onClick={handleRevealPlayer}
                  disabled={!canRevealPlayer}
                  startIcon={revealingPlayer ? <CircularProgress size={20} color="inherit" /> : <Visibility />}
                >
                  {revealingPlayer ? 'Revealing...' : 'Reveal Player (R)'}
                </Button>
              </Grid>
            </Grid>

            {currentSet && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Current Set: <strong>Set {currentSet.set_number}</strong> with {currentSet.player_count} players
              </Alert>
            )}
          </Paper>

          {/* Bidding Controls - Only show when player is active */}
          {currentPlayer && (
            <Paper 
              elevation={0} 
              sx={{ 
                p: { xs: 2, sm: 3 }, 
                background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 193, 7, 0.1) 100%)',
                border: '1px solid rgba(255, 152, 0, 0.3)',
                borderRadius: 2,
              }}
            >
              <Typography variant="h6" fontWeight="600" gutterBottom color="warning.dark" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                🔨 Bidding Controls (Keyboard: 1, 2, S, U, Z)
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="info"
                    size="large"
                    onClick={handleGoingOnce}
                    disabled={auctionState?.going_once}
                  >
                    Going Once (1)
                  </Button>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="warning"
                    size="large"
                    onClick={handleGoingTwice}
                    disabled={!auctionState?.going_once || auctionState?.going_twice}
                  >
                    Going Twice (2)
                  </Button>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    size="large"
                    onClick={handleOpenSoldDialog}
                    disabled={!highestBidder}
                    sx={{ fontWeight: 'bold' }}
                  >
                    SOLD! (S)
                  </Button>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="error"
                    size="large"
                    startIcon={<Block />}
                    onClick={handleMarkUnsold}
                  >
                    Unsold (U)
                  </Button>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Button
                variant="outlined"
                startIcon={<Undo />}
                onClick={handleUndo}
                color="warning"
              >
                Undo Last Action (Z)
              </Button>
            </Paper>
          )}

          {/* Current Player & Bidding */}
          <Grid container spacing={3}>
            {/* Current Player */}
            <Grid item xs={12} md={6}>
              <Paper 
                elevation={0} 
                sx={{ 
                  p: { xs: 2, sm: 3 }, 
                  minHeight: 300,
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  borderRadius: 2,
                }}
              >
                <Typography variant="h6" fontWeight="600" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                  🎯 Current Player
                </Typography>
                <Divider sx={{ my: 2 }} />
                {currentPlayer ? (
                  <Stack spacing={2}>
                    <Typography variant="h4" fontWeight="700" color="primary.main" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                      {currentPlayer.name}
                    </Typography>
                    <Stack direction="row" spacing={2} flexWrap="wrap">
                      <Chip label={currentPlayer.category} color="primary" />
                      <Chip 
                        label={currentPlayer.country.toUpperCase()} 
                        color={currentPlayer.country === 'india' ? 'success' : 'secondary'}
                      />
                    </Stack>
                    <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                      Base Price: ₹{currentPlayer.base_price} Cr
                    </Typography>

                    {highestBidder && (
                      <Paper 
                        sx={{ 
                          p: 2, 
                          background: 'linear-gradient(135deg, rgba(67, 233, 123, 0.2) 0%, rgba(56, 249, 215, 0.2) 100%)',
                          border: '1px solid rgba(67, 233, 123, 0.3)',
                        }}
                      >
                        <Typography variant="h5" fontWeight="700" color="success.dark" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                          Current Bid: ₹{auctionState.current_bid} Cr
                        </Typography>
                        <Typography variant="body1" color="text.primary">
                          Highest Bidder: {highestBidder.team_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Bids: {auctionState.bid_count}
                        </Typography>
                      </Paper>
                    )}

                    {auctionState?.going_once && (
                      <Chip label="🔨 Going Once" color="warning" />
                    )}
                    {auctionState?.going_twice && (
                      <Chip label="🔨🔨 Going Twice" color="error" />
                    )}
                  </Stack>
                ) : (
                  <Typography color="text.secondary">
                    No player revealed yet
                  </Typography>
                )}
              </Paper>
            </Grid>

            {/* Bid History */}
            <Grid item xs={12} md={6}>
              <Paper 
                elevation={0} 
                sx={{ 
                  p: { xs: 2, sm: 3 }, 
                  minHeight: 300,
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
                  <List sx={{ maxHeight: 250, overflow: 'auto' }}>
                    {bidHistory.map((bid, index) => (
                      <ListItem 
                        key={bid.id} 
                        sx={{ 
                          bgcolor: index === 0 ? 'rgba(67, 233, 123, 0.1)' : 'transparent', 
                          borderRadius: 1, 
                          mb: 1,
                          border: index === 0 ? '1px solid rgba(67, 233, 123, 0.3)' : 'none',
                        }}
                      >
                        <ListItemText
                          primary={
                            <Typography fontWeight={index === 0 ? 'bold' : 'normal'}>
                              {bid.teams.team_name} - ₹{bid.bid_amount} Cr
                            </Typography>
                          }
                          secondary={new Date(bid.timestamp).toLocaleTimeString()}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography color="text.secondary">
                    {currentPlayer ? 'No bids yet (waiting for teams to bid)' : 'No active bidding'}
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* Next Player Preview */}
          {nextPlayer && (
            <Paper 
              elevation={0} 
              sx={{ 
                p: { xs: 2, sm: 3 }, 
                background: 'rgba(245, 245, 245, 0.9)',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                borderRadius: 2,
              }}
            >
              <Typography variant="h6" fontWeight="600" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                👀 Coming Up Next
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} flexWrap="wrap">
                <Typography variant="h5" fontWeight="700" color="secondary.main" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                  {nextPlayer.name}
                </Typography>
                <Chip label={nextPlayer.category} color="secondary" variant="outlined" />
                <Chip 
                  label={nextPlayer.country.toUpperCase()} 
                  color={nextPlayer.country === 'india' ? 'success' : 'secondary'}
                  variant="outlined"
                />
                <Typography variant="h6" color="text.secondary" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                  Base: ₹{nextPlayer.base_price} Cr
                </Typography>
              </Stack>
            </Paper>
          )}

          {/* Logged In Teams */}
          <Paper 
            elevation={0} 
            sx={{ 
              p: { xs: 2, sm: 3 },
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              borderRadius: 2,
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center" mb={2}>
              <People color="primary" />
              <Typography variant="h6" fontWeight="600" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                Logged In Teams ({loggedInUsers.length}/10)
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {loggedInUsers.map((user) => (
                <Chip
                  key={user.id}
                  icon={<CheckCircle />}
                  label={user.team_name}
                  color="success"
                  sx={{ mb: 1 }}
                />
              ))}
              {Array.from({ length: 10 - loggedInUsers.length }).map((_, idx) => (
                <Chip
                  key={`offline-${idx}`}
                  icon={<Cancel />}
                  label="Offline"
                  variant="outlined"
                  sx={{ mb: 1 }}
                />
              ))}
            </Stack>
          </Paper>

          {/* All Teams Stats */}
          <Paper 
            elevation={0}
            sx={{
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <Box sx={{ p: 2, bgcolor: 'rgba(25, 118, 210, 0.1)', borderBottom: '1px solid rgba(25, 118, 210, 0.2)' }}>
              <Typography variant="h6" color="primary.main" fontWeight="600" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                All Teams Statistics
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Team</strong></TableCell>
                    <TableCell><strong>Purse</strong></TableCell>
                    <TableCell><strong>Squad</strong></TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}><strong>WK</strong></TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}><strong>BA</strong></TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}><strong>BO</strong></TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}><strong>AR</strong></TableCell>
                    <TableCell><strong>OS</strong></TableCell>
                    {auctionRules?.rtm_enabled_globally && (
                      <TableCell><strong>RTM</strong></TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {teams.map((team) => (
                    <TableRow key={team.id} hover>
                      <TableCell>
                        <Chip label={team.team_code.toUpperCase()} size="small" color="primary" />
                        <Typography variant="body2" sx={{ display: { xs: 'block', sm: 'inline' }, ml: { sm: 1 } }}>
                          {team.team_name}
                        </Typography>
                      </TableCell>
                      <TableCell>₹{team.current_purse} Cr</TableCell>
                      <TableCell>{team.squad_size}/25</TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{team.wk_count}</TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{team.ba_count}</TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{team.bo_count}</TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{team.ar_count}</TableCell>
                      <TableCell>{team.os_count}/8</TableCell>
                      {auctionRules?.rtm_enabled_globally && (
                        <TableCell>{team.rtm_cards}</TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Stack>
      </Container>

      {/* Sold Confirmation Dialog */}
      <Dialog open={openSoldDialog} onClose={() => setOpenSoldDialog(false)}>
        <DialogTitle>Confirm Sale</DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            Sell {currentPlayer?.name} to {highestBidder?.team_name}?
          </Typography>
          <Typography variant="h5" color="success.main" fontWeight="700">
            Final Price: ₹{auctionState?.current_bid} Cr
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSoldDialog(false)}>Cancel</Button>
          <Button onClick={handleConfirmSold} variant="contained" color="success">
            Confirm SOLD!
          </Button>
        </DialogActions>
      </Dialog>

      {/* RTM (Right to Match) Dialog - Only show if RTM enabled */}
      {auctionRules?.rtm_enabled_globally && (
        <Dialog 
          open={showRtmDialog} 
          onClose={() => {}} 
          maxWidth="sm" 
          fullWidth
          disableEscapeKeyDown
        >
          <DialogTitle sx={{ bgcolor: 'warning.light', color: 'white' }}>
            🎴 RIGHT TO MATCH AVAILABLE
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            <Stack spacing={2}>
              <Alert severity="info" icon="⏳">
                <Typography variant="body1" fontWeight="600">
                  Waiting for {rtmEligibility?.previous_team_name} to decide...
                </Typography>
              </Alert>

              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="h6" gutterBottom>
                  Player: <strong>{currentPlayer?.name}</strong>
                </Typography>
                <Typography variant="body1">
                  Highest Bid: <strong>₹{auctionState?.current_bid} Cr</strong>
                </Typography>
                <Typography variant="body1">
                  Highest Bidder: <strong>{teams.find(t => t.id === auctionState?.highest_bidder_team_id)?.team_name}</strong>
                </Typography>
              </Paper>

              <Paper sx={{ p: 2, bgcolor: 'warning.light', color: 'white' }}>
                <Typography variant="body1" gutterBottom>
                  Previous Team: <strong>{rtmEligibility?.previous_team_name}</strong>
                </Typography>
                <Typography variant="body2">
                  RTM Cards Available: <strong>{rtmEligibility?.rtm_cards_available}</strong>
</Typography>
<Typography variant="body2">
Team Purse: <strong>₹{rtmEligibility?.team_purse} Cr</strong>
</Typography>
</Paper>
<Alert 
            severity={rtmTimeout <= 10 ? 'error' : 'warning'} 
            icon="⏱️"
          >
            <Typography variant="h6" fontWeight="700">
              Time Remaining: {rtmTimeout} seconds
            </Typography>
          </Alert>

          {rtmDecision === 'used' && (
            <Alert severity="success" icon="✅">
              <Typography variant="body1" fontWeight="600">
                RTM USED! Player returns to {rtmEligibility?.previous_team_name}
              </Typography>
            </Alert>
          )}

          {rtmDecision === 'declined' && (
            <Alert severity="info" icon="❌">
              <Typography variant="body1" fontWeight="600">
                RTM DECLINED! Player sold to highest bidder
              </Typography>
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={handleRtmOverride} 
          color="error"
          variant="outlined"
        >
          Override - Skip RTM
        </Button>
      </DialogActions>
    </Dialog>
  )}
</Box>
);
};
export default AuctioneerDashboard;