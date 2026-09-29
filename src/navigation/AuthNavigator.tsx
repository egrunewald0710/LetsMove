import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '@/screens/auth/LoginScreen';
import RegisterScreen from '@/screens/auth/RegisterScreen';
import withSafeArea from './withSafeArea';

const Stack = createNativeStackNavigator();
const SafeLoginScreen = withSafeArea(LoginScreen);
const SafeRegisterScreen = withSafeArea(RegisterScreen);

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={SafeLoginScreen} />
      <Stack.Screen name="Register" component={SafeRegisterScreen} />
    </Stack.Navigator>
  );
}
