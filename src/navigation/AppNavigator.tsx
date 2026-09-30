import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '@/screens/HomeScreen';
import CalendarScreen from '@/screens/CalendarScreen';
import WorkoutBuilderScreen from '@/screens/WorkoutBuilderScreen';
import WorkoutDetailsScreen from '@/screens/WorkoutDetailsScreen';
import WorkoutLibraryScreen from '@/screens/WorkoutLibraryScreen';
import RaceScreen from '@/screens/RaceScreen';
import AnalysisScreen from '@/screens/AnalysisScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import ProfileHubScreen from '@/screens/ProfileHubScreen';
import MarketplaceScreen from '@/screens/MarketplaceScreen';
import MarketplacePlanScreen from '@/screens/MarketplacePlanScreen';
import CoachChatScreen from '@/screens/CoachChatScreen';
import AICoachChatScreen from '@/screens/AICoachChatScreen';
import AICoachPlannerScreen from '@/screens/AICoachPlannerScreen';
import { colors, radius } from '@/theme/theme';
import withSafeArea from './withSafeArea';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const CalendarStack = createNativeStackNavigator();
const LibraryStack = createNativeStackNavigator();
const AnalysisStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();
const SafeHomeScreen = withSafeArea(HomeScreen);
const SafeCalendarScreen = withSafeArea(CalendarScreen);
const SafeWorkoutDetailsScreen = withSafeArea(WorkoutDetailsScreen);
const SafeProfileScreen = withSafeArea(ProfileScreen);
const SafeWorkoutLibraryScreen = withSafeArea(WorkoutLibraryScreen);
const SafeRaceScreen = withSafeArea(RaceScreen);
const SafeAnalysisScreen = withSafeArea(AnalysisScreen);
const SafeAICoachChatScreen = withSafeArea(AICoachChatScreen);
const SafeProfileHubScreen = withSafeArea(ProfileHubScreen);
const SafeMarketplaceScreen = withSafeArea(MarketplaceScreen);
const SafeMarketplacePlanScreen = withSafeArea(MarketplacePlanScreen);
const SafeCoachChatScreen = withSafeArea(CoachChatScreen);

function HomeStackScreen() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800' },
        headerShadowVisible: false,
      }}
    >
      <HomeStack.Screen
        name="HomeMain"
        component={SafeHomeScreen}
        options={{ headerShown: false }}
      />

      <HomeStack.Screen
        name="WorkoutBuilder"
        component={WorkoutBuilderScreen}
        options={{
          title: 'Build Workout',
          presentation: 'modal',
        }}
      />

      <HomeStack.Screen
        name="WorkoutDetails"
        component={SafeWorkoutDetailsScreen}
        options={{ headerShown: false }}
      />

      <HomeStack.Screen
        name="AICoachChat"
        component={SafeAICoachChatScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />

      <HomeStack.Screen
        name="Race"
        component={SafeRaceScreen}
        options={{ headerShown: false }}
      />

      <HomeStack.Screen
        name="AICoachPlanner"
        component={AICoachPlannerScreen}
        options={{ title: 'AI Coach', presentation: 'modal' }}
      />
    </HomeStack.Navigator>
  );
}

function CalendarStackScreen() {
  return (
    <CalendarStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800' },
        headerShadowVisible: false,
      }}
    >
      <CalendarStack.Screen
        name="CalendarMain"
        component={SafeCalendarScreen}
        options={{ headerShown: false }}
      />

      <CalendarStack.Screen
        name="WorkoutBuilder"
        component={WorkoutBuilderScreen}
        options={{
          title: 'Build Workout',
          presentation: 'modal',
        }}
      />

      <CalendarStack.Screen
        name="WorkoutDetails"
        component={SafeWorkoutDetailsScreen}
        options={{ headerShown: false }}
      />
    </CalendarStack.Navigator>
  );
}

function LibraryStackScreen() {
  return (
    <LibraryStack.Navigator screenOptions={{ headerShown: false }}>
      <LibraryStack.Screen name="LibraryMain" component={SafeWorkoutLibraryScreen} />
      <LibraryStack.Screen name="WorkoutDetails" component={SafeWorkoutDetailsScreen} />
    </LibraryStack.Navigator>
  );
}

function AnalysisStackScreen() {
  return (
    <AnalysisStack.Navigator screenOptions={{ headerShown: false }}>
      <AnalysisStack.Screen name="AnalysisMain" component={SafeAnalysisScreen} />
      <AnalysisStack.Screen name="WorkoutDetails" component={SafeWorkoutDetailsScreen} />
    </AnalysisStack.Navigator>
  );
}

function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800' },
        headerShadowVisible: false,
      }}
    >
      <ProfileStack.Screen
        name="ProfileHome"
        component={SafeProfileHubScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="AthleteProfile"
        component={SafeProfileScreen}
        options={{ title: 'Athlete profile' }}
      />
      <ProfileStack.Screen
        name="Marketplace"
        component={SafeMarketplaceScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="MarketplacePlan"
        component={SafeMarketplacePlanScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="CoachChat"
        component={SafeCoachChatScreen}
        options={{ headerShown: false }}
      />
    </ProfileStack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          height: 70,
          paddingTop: 7,
          paddingBottom: 8,
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
        },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<
            string,
            keyof typeof Ionicons.glyphMap
          > = {
            Home: focused ? 'home' : 'home-outline',
            Calendar: focused ? 'calendar' : 'calendar-outline',
            Library: focused ? 'library' : 'library-outline',
            Analysis: focused ? 'stats-chart' : 'stats-chart-outline',
            Profile: focused ? 'person-circle' : 'person-circle-outline',
          };

          return (
            <Ionicons
              name={icons[route.name] ?? 'ellipse-outline'}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStackScreen} />
      <Tab.Screen name="Calendar" component={CalendarStackScreen} />
      <Tab.Screen name="Library" component={LibraryStackScreen} />
      <Tab.Screen name="Analysis" component={AnalysisStackScreen} />
      <Tab.Screen name="Profile" component={ProfileStackScreen} />
    </Tab.Navigator>
  );
}
